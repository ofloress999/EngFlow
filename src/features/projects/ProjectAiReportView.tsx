import { Bot, Download, FileText, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Stat } from "../../components";
import type { DailyLog, Project, Ticket, WorkUpdate } from "../../types";
import { money, relativeTime } from "../../utils/format";
import { connectProjectRealtime } from "../../utils/realtime";

type ProjectAiReportViewProps = {
  actorUserId: string;
  project: Project;
};

export function ProjectAiReportView({ actorUserId, project }: ProjectAiReportViewProps) {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [updates, setUpdates] = useState<WorkUpdate[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "Gerar um relatorio completo para todos os colaboradores da obra com o que foi feito, gastos, pendencias e proximos passos.",
  );

  const executed = useMemo(
    () => dailyLogs.flatMap((log) => log.servicesExecuted ? [log.servicesExecuted] : []),
    [dailyLogs],
  );
  const problems = useMemo(
    () => dailyLogs.flatMap((log) => log.problemsFound ? [log.problemsFound] : []),
    [dailyLogs],
  );
  const materials = useMemo(
    () => dailyLogs.flatMap((log) => log.materialsUsed ? [log.materialsUsed] : []),
    [dailyLogs],
  );
  const totalWorkers = dailyLogs.reduce((sum, log) => sum + Number(log.workerCount ?? 0), 0);
  const pendingTickets = tickets.filter((ticket) => !/RESOLVIDO|CANCELADO/i.test(ticket.status)).length;

  async function load() {
    const [logsResult, updatesResult, ticketsResult] = await Promise.allSettled([
      engflowApi.listDailyLogs(project.id, actorUserId),
      engflowApi.listUpdates(project.id, actorUserId),
      engflowApi.listTickets(project.id, actorUserId),
    ]);

    if (logsResult.status === "fulfilled") setDailyLogs(logsResult.value);
    if (updatesResult.status === "fulfilled") setUpdates(updatesResult.value);
    if (ticketsResult.status === "fulfilled") setTickets(ticketsResult.value);

    setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

    const failedSources = [
      logsResult.status === "rejected" ? "diario" : null,
      updatesResult.status === "rejected" ? "atualizacoes" : null,
      ticketsResult.status === "rejected" ? "chamados" : null,
    ].filter(Boolean);

    if (failedSources.length > 0) {
      const firstError =
        logsResult.status === "rejected"
          ? logsResult.reason
          : updatesResult.status === "rejected"
            ? updatesResult.reason
            : ticketsResult.status === "rejected"
              ? ticketsResult.reason
              : null;
      setMessage(
        `${getApiErrorMessage(firstError, "Alguns dados nao foram carregados.")} Fonte com falha: ${failedSources.join(", ")}. O relatorio sera gerado com os dados disponiveis.`,
      );
      return;
    }

    setMessage(null);
  }

  useEffect(() => {
    void load();
  }, [project.id, actorUserId]);

  useEffect(() => {
    return connectProjectRealtime(project.id, (event) => {
      if (
        event.type === "DAILY_LOG_UPDATED" ||
        event.type === "TIMELINE_UPDATED" ||
        event.type === "TICKET_UPDATED"
      ) {
        void load();
      }
    });
  }, [project.id, actorUserId]);

  useEffect(() => {
    if (!aiReport) {
      setAiReport(buildLocalReport(project, dailyLogs, updates, tickets));
    }
  }, [dailyLogs, updates, tickets, project.id]);

  async function generateAiReport() {
    setIsGenerating(true);
    const base = buildLocalReport(project, dailyLogs, updates, tickets);
    try {
      const response = await engflowApi.askEngineeringAssistant({
        provider: "openai",
        projectName: project.name,
        projectStatus: project.status,
        projectProgress: project.progress,
        fileCount: updates.length + dailyLogs.length,
        prompt: [
          "Pedido do usuario:",
          prompt,
          "Contexto real atualizado da obra para usar obrigatoriamente no relatorio:",
          base,
        ].join("\n\n"),
      });
      setAiReport(response.answer);
    } catch {
      setAiReport(base);
    } finally {
      setIsGenerating(false);
    }
  }

  function exportReport() {
    const content = [
      "EngFlow - Relatorio IA da Obra",
      `Obra: ${project.name}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      aiReport,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-ia-${project.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-6">
      <div className="panel rounded-[2rem] p-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              Relatorio IA
            </p>
            <h3 className="text-3xl font-black tracking-tight">Resumo inteligente para colaboradores</h3>
            <p className="muted mt-2 max-w-3xl">
              Revisao do andamento da obra, diario de campo, custos, pendencias e proximos passos para todos os usuarios vinculados.
            </p>
            {lastSync && <p className="mt-2 text-xs font-black text-[var(--accent-strong)]">Dados sincronizados as {lastSync}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" type="button" onClick={() => void load()}>
              <RefreshCw size={17} />
              Atualizar dados
            </button>
          </div>
        </div>

        {message && <p className="mb-4 rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{message}</p>}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Progresso" value={`${project.progress}%`} detail={project.status} />
          <Stat title="Gasto total" value={money(project.spent)} detail="financeiro atual" />
          <Stat title="Diarios" value={String(dailyLogs.length)} detail={`${totalWorkers} trabalhadores/dia`} />
          <Stat title="Pendencias" value={String(pendingTickets + problems.length)} detail="chamados e ocorrencias" />
        </div>

        <div className="surface-soft mt-5 rounded-3xl p-4">
          <label className="block">
            <span className="muted mb-2 block text-sm font-bold">Prompt para IA</span>
            <textarea
              className="input-shell min-h-32 rounded-2xl px-4 py-3"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex.: Gere um relatorio semanal executivo, destaque atrasos, gastos e proximas tarefas..."
            />
          </label>
          <button
            className="btn-primary mt-3 flex w-full items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60 sm:w-fit"
            type="button"
            onClick={() => void generateAiReport()}
            disabled={isGenerating || !prompt.trim()}
          >
            <Send size={17} />
            {isGenerating ? "Gerando relatorio..." : "Enviar prompt para IA"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.58fr_1fr]">
        <aside className="grid gap-4">
          <ReportCard title="O que foi feito" items={executed} empty="Nenhum diario com servicos executados." />
          <ReportCard title="Materiais usados" items={materials} empty="Nenhum material registrado no diario." />
          <ReportCard title="Ocorrencias" items={problems} empty="Sem problemas registrados." />
        </aside>

        <section className="panel rounded-[2rem] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-black">
                <Bot size={21} />
                Relatorio consolidado
              </h3>
              <p className="muted mt-1 text-sm">Texto pronto para compartilhar com clientes e colaboradores.</p>
            </div>
            <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={exportReport}>
              <Download size={16} />
              Exportar
            </button>
          </div>
          <div className="surface-soft rounded-3xl p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text)]">{aiReport || buildLocalReport(project, dailyLogs, updates, tickets)}</pre>
          </div>
        </section>
      </div>
    </section>
  );
}

function ReportCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="panel rounded-[2rem] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
        <FileText size={19} />
        {title}
      </h3>
      <div className="grid gap-3">
        {items.slice(0, 6).map((item, index) => (
          <p className="panel-flat rounded-2xl p-3 text-sm leading-6" key={`${item}-${index}`}>
            {item}
          </p>
        ))}
        {items.length === 0 && <p className="surface-soft rounded-2xl p-3 text-sm font-semibold text-[var(--muted)]">{empty}</p>}
      </div>
    </section>
  );
}

function buildLocalReport(project: Project, dailyLogs: DailyLog[], updates: WorkUpdate[], tickets: Ticket[]) {
  const latestLogs = [...dailyLogs]
    .sort((a, b) => String(b.logDate).localeCompare(String(a.logDate)))
    .slice(0, 14);
  const done = latestLogs.map((log) => `- ${formatDate(log.logDate)}: ${log.servicesExecuted}`).join("\n") || "- Ainda nao ha servicos diarios registrados.";
  const updatesText = updates.slice(0, 5).map((update) => `- ${update.title}: ${update.description} (${relativeTime(update.createdAt)})`).join("\n") || "- Sem atualizacoes recentes.";
  const pending = tickets.filter((ticket) => !/RESOLVIDO|CANCELADO/i.test(ticket.status));
  const pendingText = pending.map((ticket) => `- ${ticket.subject} | ${ticket.status}`).join("\n") || "- Sem chamados pendentes.";
  const problems = dailyLogs.flatMap((log) => log.problemsFound ? [`- ${formatDate(log.logDate)}: ${log.problemsFound}`] : []).join("\n") || "- Sem ocorrencias registradas.";

  return [
    `Resumo da obra ${project.name}`,
    "",
    `Status atual: ${project.status}. Progresso informado: ${project.progress}%.`,
    `Financeiro: gasto total ${money(project.spent)}, investido ${money(project.invested)}, valor cobrado ${money(project.charged)}.`,
    "",
    "O que foi feito diariamente:",
    done,
    "",
    "Atualizacoes registradas:",
    updatesText,
    "",
    "Ocorrencias e riscos:",
    problems,
    "",
    "Chamados e pendencias:",
    pendingText,
    "",
    "Proximos passos sugeridos:",
    "- Validar pendencias tecnicas antes de novas etapas.",
    "- Conferir materiais e custos previstos para a proxima semana.",
    "- Registrar diario de obra diariamente com foto, equipe, materiais e problemas.",
    "- Compartilhar este resumo com todos os colaboradores vinculados.",
  ].join("\n");
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
