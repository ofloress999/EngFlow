import { CalendarDays, CloudSun, Download, ImagePlus, Printer, UploadCloud, Users, Video } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field, Stat } from "../../components";
import type { DailyLog } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { connectProjectRealtime } from "../../utils/realtime";

type DailyLogsViewProps = {
  actorUserId: string;
  projectId?: string;
  canCreate: boolean;
};

type ReportMode = "todos" | "semanal" | "mensal";

export function DailyLogsView({ actorUserId, projectId, canCreate }: DailyLogsViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [reportMode, setReportMode] = useState<ReportMode>("todos");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    logDate: today,
    weather: "Ensolarado",
    temperature: "",
    workerCount: "1",
    servicesExecuted: "",
    problemsFound: "",
    materialsUsed: "",
    photoUrl: "",
    videoUrl: "",
    observations: "",
  });

  const visibleLogs = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (reportMode === "semanal") start.setDate(now.getDate() - 7);
    if (reportMode === "mensal") start.setMonth(now.getMonth() - 1);
    if (reportMode === "todos") return logs;
    return logs.filter((log) => new Date(`${log.logDate}T00:00:00`).getTime() >= start.getTime());
  }, [logs, reportMode]);

  const totalWorkers = visibleLogs.reduce((sum, log) => sum + Number(log.workerCount ?? 0), 0);
  const logsWithProblems = visibleLogs.filter((log) => Boolean(log.problemsFound?.trim())).length;

  async function load() {
    if (!projectId) return;
    setLogs(await engflowApi.listDailyLogs(projectId, actorUserId));
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar o diario.")));
  }, [projectId, actorUserId]);

  useEffect(() => {
    if (!projectId) return;
    return connectProjectRealtime(projectId, (event) => {
      if (event.type === "DAILY_LOG_UPDATED") {
        load().catch(() => undefined);
      }
    });
  }, [projectId, actorUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    try {
      await engflowApi.createDailyLog(projectId, {
        actorUserId,
        logDate: form.logDate,
        weather: form.weather,
        temperature: form.temperature,
        workerCount: Number(form.workerCount) || 0,
        servicesExecuted: form.servicesExecuted,
        problemsFound: form.problemsFound || undefined,
        materialsUsed: form.materialsUsed || undefined,
        photoUrl: form.photoUrl || undefined,
        videoUrl: form.videoUrl || undefined,
        observations: form.observations || undefined,
      });
      setForm({ ...form, servicesExecuted: "", problemsFound: "", materialsUsed: "", photoUrl: "", videoUrl: "", observations: "" });
      await load();
      setMessage("Diario de obra registrado.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar o diario."));
    }
  }

  async function handleMediaSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (file.type.startsWith("video/")) {
      setForm({ ...form, videoUrl: dataUrl });
      return;
    }
    setForm({ ...form, photoUrl: dataUrl });
  }

  function handlePrint() {
    window.print();
  }

  if (!projectId) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Diario de obra</h2>
        <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Diario de obra</h2>
          <p className="muted mt-1">Registro mobile-first de campo com midia, problemas, materiais e relatorios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-shell w-fit rounded-2xl px-4 py-3 text-sm font-bold" value={reportMode} onChange={(event) => setReportMode(event.target.value as ReportMode)}>
            <option value="todos">Todos</option>
            <option value="semanal">Relatorio semanal</option>
            <option value="mensal">Relatorio mensal</option>
          </select>
          <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" type="button" onClick={handlePrint}>
            <Printer size={17} />
            PDF
          </button>
        </div>
      </div>

      {message && <p className="mb-4 rounded-xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Stat title="Registros" value={String(visibleLogs.length)} detail={reportMode} />
        <Stat title="Equipe acumulada" value={String(totalWorkers)} detail="trabalhadores/dia" />
        <Stat title="Ocorrencias" value={String(logsWithProblems)} detail="com problema" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1fr]">
        {canCreate && (
          <form className="surface-soft grid gap-3 rounded-3xl p-4" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 font-black">
              <UploadCloud size={18} />
              Registro de campo
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data" type="date" value={form.logDate} onChange={(value) => setForm({ ...form, logDate: value })} />
              <label className="block">
                <span className="muted mb-2 block text-sm font-semibold">Clima</span>
                <select className="input-shell rounded-xl px-4 py-3" value={form.weather} onChange={(event) => setForm({ ...form, weather: event.target.value })}>
                  <option>Ensolarado</option>
                  <option>Nublado</option>
                  <option>Chuva leve</option>
                  <option>Chuva forte</option>
                  <option>Vento forte</option>
                </select>
              </label>
              <Field label="Temperatura" value={form.temperature} onChange={(value) => setForm({ ...form, temperature: value })} placeholder="28 C" />
              <Field label="Trabalhadores" type="number" value={form.workerCount} onChange={(value) => setForm({ ...form, workerCount: value })} />
            </div>
            <Field label="Servicos executados" value={form.servicesExecuted} onChange={(value) => setForm({ ...form, servicesExecuted: value })} multiline />
            <Field label="Problemas encontrados" value={form.problemsFound} onChange={(value) => setForm({ ...form, problemsFound: value })} multiline />
            <Field label="Materiais utilizados" value={form.materialsUsed} onChange={(value) => setForm({ ...form, materialsUsed: value })} multiline />
            <Field label="Observacoes" value={form.observations} onChange={(value) => setForm({ ...form, observations: value })} multiline />
            <label className="surface-soft cursor-pointer rounded-2xl border-dashed p-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <ImagePlus size={17} />
                Upload rapido de foto ou video
              </span>
              <input className="sr-only" type="file" accept="image/*,video/*" onChange={handleMediaSelect} />
            </label>
            <button className="btn-primary px-4 py-3 font-bold">Salvar diario</button>
          </form>
        )}

        <div className="print-area grid gap-4">
          {visibleLogs.map((log) => (
            <article className="panel-flat rounded-2xl p-4" key={log.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[var(--accent-strong)]">{new Date(`${log.logDate}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                  <h3 className="mt-1 font-black">Diario de campo</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black"><CloudSun size={14} />{log.weather ?? "Clima"}</span>
                  <span className="badge flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black"><Users size={14} />{log.workerCount}</span>
                </div>
              </div>
              {log.photoUrl && <img className="mb-3 max-h-80 w-full rounded-2xl object-cover" src={log.photoUrl} alt="Foto do diario" />}
              {log.videoUrl && <video className="mb-3 max-h-80 w-full rounded-2xl bg-black object-contain" src={log.videoUrl} controls />}
              <LogBlock title="Servicos executados" value={log.servicesExecuted} />
              <LogBlock title="Problemas" value={log.problemsFound} />
              <LogBlock title="Materiais" value={log.materialsUsed} />
              <LogBlock title="Observacoes" value={log.observations} />
            </article>
          ))}
          {visibleLogs.length === 0 && <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">Nenhum diario cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

function LogBlock({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-black">{title}</p>
      <p className="muted mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}
