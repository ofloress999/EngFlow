import {
  Bot,
  Boxes,
  BrainCircuit,
  Calculator,
  ClipboardList,
  Download,
  FileClock,
  FileSearch,
  FileSignature,
  FileText,
  Layers3,
  Ruler,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { engflowApi } from "../../api/engflowApi";
import type { Project, ProjectFile } from "../../types";
import { money } from "../../utils/format";

type SmartEngineeringHubProps = {
  project: Project;
  files: ProjectFile[];
  canManage: boolean;
};

type AiProvider = "openai" | "gemini";
type AiAction = "checklist" | "relatorio" | "semana" | "duvida" | "orcamento" | "compatibilizacao";

const actions: { id: AiAction; label: string; prompt: string }[] = [
  { id: "checklist", label: "Checklist", prompt: "Criar checklist de fundacao" },
  { id: "relatorio", label: "Relatorio", prompt: "Gerar relatorio semanal" },
  { id: "semana", label: "Resumo", prompt: "Resumo da obra" },
  { id: "duvida", label: "Duvida tecnica", prompt: "Quanto concreto preciso para 120m2?" },
  { id: "orcamento", label: "Orcamento", prompt: "Auxiliar orcamento de casa popular" },
  { id: "compatibilizacao", label: "Conflitos", prompt: "Compatibilizacao basica dos projetos" },
];

const budgetTemplates = [
  { name: "Casa popular", area: 58, material: 92000, labor: 54000, tax: 0.08, profit: 0.14 },
  { name: "Sobrado", area: 142, material: 248000, labor: 156000, tax: 0.09, profit: 0.18 },
  { name: "Reforma", area: 75, material: 68000, labor: 47000, tax: 0.07, profit: 0.16 },
  { name: "Galpao", area: 420, material: 398000, labor: 221000, tax: 0.1, profit: 0.2 },
];

const smartSheetRows = [
  ["Materiais", "Quantidade x valor unitario", "Soma automatica"],
  ["Mao de obra", "Horas x equipe x diaria", "Custo previsto"],
  ["Impostos", "Subtotal x percentual", "Imposto calculado"],
  ["Lucro", "Subtotal x margem", "Margem calculada"],
  ["Concluido", "Executado / total", "Percentual da obra"],
];

export function SmartEngineeringHub({ project, files, canManage }: SmartEngineeringHubProps) {
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [prompt, setPrompt] = useState("Gerar resumo semanal da obra");
  const [answer, setAnswer] = useState(() => buildAiResponse("semana", project, files, "openai"));
  const [isAsking, setIsAsking] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(budgetTemplates[0]);
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState(["Arquitetonico", "Estrutural", "Eletrico", "Hidraulico"]);
  const versions = useMemo(() => buildVersions(files), [files]);
  const conflicts = useMemo(() => buildConflicts(files, project.progress), [files, project.progress]);
  const semanticResults = useMemo(() => buildSearchResults(search, files, conflicts), [search, files, conflicts]);
  const selectedTotal = selectedTemplate.material + selectedTemplate.labor;
  const selectedGrandTotal = selectedTotal * (1 + selectedTemplate.tax + selectedTemplate.profit);

  async function askAi(action?: AiAction) {
    const detected = action ?? detectAction(prompt);
    const nextPrompt = actions.find((item) => item.id === detected)?.prompt ?? prompt;
    setPrompt(nextPrompt);
    setIsAsking(true);
    try {
      const response = await engflowApi.askEngineeringAssistant({
        prompt: nextPrompt,
        provider,
        projectName: project.name,
        projectStatus: project.status,
        projectProgress: project.progress,
        fileCount: files.length,
      });
      setAnswer(`${response.answer}${response.fallback ? "\n\nModo fallback ativo: configure a chave no backend para resposta do provedor real." : ""}`);
    } catch {
      setAnswer(buildAiResponse(detected, project, files, provider));
    } finally {
      setIsAsking(false);
    }
  }

  function toggleLayer(layer: string) {
    setActiveLayers((current) =>
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer],
    );
  }

  function exportBudget() {
    const rows = [
      ["Template", "Area m2", "Materiais", "Mao de obra", "Impostos", "Lucro", "Total"],
      [
        selectedTemplate.name,
        String(selectedTemplate.area),
        String(selectedTemplate.material),
        String(selectedTemplate.labor),
        String(selectedTotal * selectedTemplate.tax),
        String(selectedTotal * selectedTemplate.profit),
        String(selectedGrandTotal),
      ],
    ];
    downloadText(`${selectedTemplate.name.toLowerCase().replace(/\s+/g, "-")}.csv`, rows.map((row) => row.join(";")).join("\n"));
  }

  function exportReport() {
    downloadText(
      `relatorio-${project.name.toLowerCase().replace(/\s+/g, "-")}.txt`,
      [
        `EngFlow - Relatorio automatico`,
        `Obra: ${project.name}`,
        `Status: ${project.status}`,
        `Progresso: ${project.progress}%`,
        `Resumo IA: ${answer}`,
        `Conflitos ativos: ${conflicts.length}`,
        `Assinatura: pendente via DocuSign`,
      ].join("\n"),
    );
  }

  return (
    <div className="grid gap-6">
      <section className="panel rounded-[2rem] p-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              IA + BIM
            </p>
            <h3 className="text-3xl font-black tracking-tight">Central inteligente da obra</h3>
            <p className="muted mt-2 max-w-3xl">
              Assistente tecnico, compatibilizacao, versionamento, viewer 3D, relatorios e busca em um fluxo unico.
            </p>
          </div>
          <div className="flex rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1">
            {(["openai", "gemini"] as AiProvider[]).map((item) => (
              <button
                className={`rounded-xl px-4 py-2 text-sm font-black ${provider === item ? "bg-[var(--surface)] text-[var(--accent-strong)] shadow-sm" : "muted"}`}
                key={item}
                onClick={() => setProvider(item)}
                type="button"
              >
                {item === "openai" ? "OpenAI" : "Gemini"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.78fr_1fr]">
          <div className="surface-soft rounded-3xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <BrainCircuit className="text-[var(--accent-strong)]" size={20} />
              <h4 className="font-black">Assistente IA da obra</h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {actions.map((action) => (
                <button className="btn-secondary px-3 py-2 text-sm font-bold" key={action.id} onClick={() => void askAi(action.id)} type="button">
                  {action.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className="input-shell min-w-0 flex-1 rounded-xl px-4 py-3"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Pergunte sobre concreto, relatorios, checklist..."
              />
              <button className="btn-primary flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-60" onClick={() => void askAi()} type="button" aria-label="Enviar pergunta" disabled={isAsking}>
                <Send size={18} />
              </button>
            </div>
            <div className="panel-flat mt-4 rounded-2xl p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black">
                <Bot size={17} />
                {isAsking ? "Consultando IA..." : `Resposta ${provider === "openai" ? "OpenAI-ready" : "Gemini-ready"}`}
              </p>
              <p className="muted whitespace-pre-line text-sm leading-6">{answer}</p>
            </div>
          </div>

          <div className="surface-soft rounded-3xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-black">Viewer 3D BIM</h4>
                <p className="muted text-sm">IFC, OBJ, GLTF, DWG e RVT preparados para pipeline Three.js/xeokit/APS.</p>
              </div>
              <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">Lazy loading</span>
            </div>
            <div className="viewer-grid relative min-h-[22rem] overflow-hidden rounded-3xl border border-[var(--border)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bim-model-scene">
                  {activeLayers.includes("Arquitetonico") && <span className="bim-layer bim-layer-a" />}
                  {activeLayers.includes("Estrutural") && <span className="bim-layer bim-layer-b" />}
                  {activeLayers.includes("Eletrico") && <span className="bim-layer bim-layer-c" />}
                  {activeLayers.includes("Hidraulico") && <span className="bim-layer bim-layer-d" />}
                </div>
              </div>
              <div className="absolute left-4 top-4 grid gap-2">
                {["Arquitetonico", "Estrutural", "Eletrico", "Hidraulico"].map((layer) => (
                  <button
                    className={`rounded-xl px-3 py-2 text-left text-xs font-black shadow-sm ${activeLayers.includes(layer) ? "bg-[var(--surface)] text-[var(--accent-strong)]" : "bg-black/40 text-white"}`}
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    type="button"
                  >
                    {layer}
                  </button>
                ))}
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                {[Layers3, Ruler, Boxes].map((Icon, index) => (
                  <button className="icon-button flex h-10 w-10 items-center justify-center" key={index} type="button">
                    <Icon size={17} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
        <Panel title="Versionamento profissional" icon={FileClock}>
          <div className="grid gap-3">
            {versions.map((version) => (
              <div className="panel-flat rounded-2xl p-4" key={version.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">{version.name}</p>
                    <p className="muted mt-1 text-sm">{version.author} | {version.date}</p>
                  </div>
                  <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">V{version.version}</span>
                </div>
                <p className="muted mt-2 text-sm">{version.diff}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Compatibilizacao" icon={ShieldAlert}>
          <div className="grid gap-3">
            {conflicts.map((conflict) => (
              <div className="panel-flat rounded-2xl p-4" key={conflict.title}>
                <div className="flex items-start gap-3">
                  <span className="status-dot mt-1 bg-rose-500" />
                  <div>
                    <p className="font-black">{conflict.title}</p>
                    <p className="muted mt-1 text-sm">{conflict.location} | Resp.: {conflict.owner}</p>
                    <p className="mt-2 text-sm">{conflict.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Biblioteca de orcamentos" icon={Calculator}>
          <div className="grid gap-3">
            {budgetTemplates.map((template) => (
              <button
                className={`panel-flat rounded-2xl p-4 text-left ${selectedTemplate.name === template.name ? "ring-2 ring-teal-400/50" : ""}`}
                key={template.name}
                onClick={() => setSelectedTemplate(template)}
                type="button"
              >
                <p className="font-black">{template.name}</p>
                <p className="muted mt-1 text-sm">{template.area} m2 | {money(template.material + template.labor)}</p>
              </button>
            ))}
            <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold" onClick={exportBudget} type="button">
              <Download size={17} />
              Exportar Excel/CSV
            </button>
          </div>
        </Panel>

        <Panel title="Planilhas inteligentes" icon={ClipboardList}>
          <div className="grid gap-3">
            {smartSheetRows.map(([name, input, output]) => (
              <div className="panel-flat rounded-2xl p-3" key={name}>
                <p className="font-black">{name}</p>
                <p className="muted mt-1 text-sm">{input}</p>
                <p className="mt-1 text-sm font-bold text-[var(--accent-strong)]">{output}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Relatorios e assinatura" icon={FileSignature}>
          <div className="grid gap-3">
            <MetricLine label="PDF profissional" value="Logo, assinatura, graficos e fotos" />
            <MetricLine label="Semanal / mensal" value="Geracao automatica por obra" />
            <MetricLine label="DocuSign" value={canManage ? "Contratos, aprovacoes e projetos" : "Aguardando gestor"} />
            <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold" onClick={exportReport} type="button">
              <FileText size={17} />
              Gerar relatorio
            </button>
          </div>
        </Panel>
      </section>

      <section className="panel rounded-[2rem] p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-xl font-black">Busca inteligente</h3>
            <p className="muted mt-1 text-sm">Arquivos, projetos, comentarios, chamados, OCR e tags automaticas.</p>
          </div>
          <label className="input-shell flex max-w-xl items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="subtle" size={18} />
            <input className="min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar: eletrica, viga, relatorio..." />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {semanticResults.map((result) => (
            <div className="panel-flat rounded-2xl p-4" key={`${result.type}-${result.title}`}>
              <p className="flex items-center gap-2 text-sm font-black">
                <FileSearch size={16} />
                {result.type}
              </p>
              <p className="mt-2 font-black">{result.title}</p>
              <p className="muted mt-1 text-sm">{result.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Bot; children: ReactNode }) {
  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>
        <Icon className="text-[var(--accent-strong)]" size={23} />
      </div>
      {children}
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-flat rounded-2xl p-4">
      <p className="font-black">{label}</p>
      <p className="muted mt-1 text-sm">{value}</p>
    </div>
  );
}

function buildVersions(files: ProjectFile[]) {
  const source = files.length ? files : [{ id: "demo", name: "Projeto arquitetonico.ifc", category: "ARQUITETONICO" } as ProjectFile];
  return source.slice(0, 5).map((file, index) => ({
    id: `${file.id}-${index}`,
    name: file.name,
    version: index + 1,
    author: index % 2 === 0 ? "Engenharia" : "Arquitetura",
    date: new Date(Date.now() - index * 86400000).toLocaleDateString("pt-BR"),
    diff: index === 0 ? "Versao atual com revisoes de tags, pasta e disciplina." : "Versao antiga preservada para auditoria e comparacao.",
  }));
}

function buildConflicts(files: ProjectFile[], progress: number) {
  const hasElectric = files.some((file) => /ELETR|eletr/i.test(`${file.name} ${file.category}`));
  const hasHydraulic = files.some((file) => /HIDRA|hidra/i.test(`${file.name} ${file.category}`));
  return [
    {
      title: hasHydraulic ? "Hidraulica atravessando elemento estrutural" : "Possivel interferencia hidraulica",
      location: "Pav. terreo | eixo B-3",
      owner: "Engenheiro responsavel",
      comment: "Revisar shaft e desvio antes da proxima concretagem.",
    },
    {
      title: hasElectric ? "Eletrica cruzando viga" : "Passagem eletrica sem coordenacao BIM",
      location: "Pav. superior | eixo C-2",
      owner: "Projetista eletrico",
      comment: progress > 60 ? "Prioridade alta: obra em fase avancada." : "Validar antes da execucao.",
    },
  ];
}

function buildSearchResults(search: string, files: ProjectFile[], conflicts: ReturnType<typeof buildConflicts>) {
  const base = [
    ...files.map((file) => ({ type: "Arquivo", title: file.name, detail: `${file.category} | ${file.tags ?? "tags automaticas pendentes"}` })),
    ...conflicts.map((conflict) => ({ type: "Conflito", title: conflict.title, detail: conflict.location })),
    { type: "Relatorio", title: "Resumo semanal automatico", detail: "PDF com fotos, graficos e assinatura." },
    { type: "OCR", title: "Leitura de PDF/DOCX", detail: "Texto indexado para busca semantica." },
  ];
  if (!search.trim()) return base.slice(0, 8);
  return base.filter((item) => `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
}

function detectAction(prompt: string): AiAction {
  const text = prompt.toLowerCase();
  if (text.includes("checklist")) return "checklist";
  if (text.includes("relatorio")) return "relatorio";
  if (text.includes("resumo")) return "semana";
  if (text.includes("concreto") || text.includes("orcamento") || text.includes("m2")) return "orcamento";
  if (text.includes("conflito") || text.includes("compat")) return "compatibilizacao";
  return "duvida";
}

function buildAiResponse(action: AiAction, project: Project, files: ProjectFile[], provider: AiProvider) {
  const header = `${provider === "openai" ? "OpenAI Responses API" : "Gemini generateContent"} preparado para operar via backend seguro.`;
  const context = `Obra ${project.name}, status ${project.status}, progresso ${project.progress}%, arquivos tecnicos ${files.length}.`;
  const responses: Record<AiAction, string> = {
    checklist: "- Conferir locacao e gabarito.\n- Validar formas, ferragens e cobrimento.\n- Registrar fotos antes da concretagem.\n- Aprovar responsavel tecnico e cliente.",
    relatorio: "- Avanco fisico consolidado.\n- Pendencias tecnicas e financeiras.\n- Fotos e documentos anexados.\n- Proximas atividades e responsaveis.",
    semana: `Resumo: a obra esta em ${project.progress}% e deve priorizar compatibilizacao, financeiro e comunicacao de pendencias.`,
    duvida: "Para concreto, estime volume = area x espessura. Ex.: 120m2 com laje de 10cm = 12m3, acrescente 5% a 10% de perda.",
    orcamento: "Use template, area, padrao de acabamento, BDI, impostos e margem. A planilha calcula subtotal, impostos, lucro e total automaticamente.",
    compatibilizacao: "Analise modelos por disciplina, sobreponha layers, liste interferencias, atribua responsavel e acompanhe resolucao por chamado tecnico.",
  };
  return `${header}\n${context}\n\n${responses[action]}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
