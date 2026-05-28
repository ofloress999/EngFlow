import { Download, FileArchive, FileSearch, FolderKanban, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Stat } from "../../components";
import type { Project, ProjectFile } from "../../types";

type DocumentsViewProps = {
  actorUserId: string;
  projects: Project[];
};

type ProjectDocument = ProjectFile & {
  projectId: string;
  projectName: string;
  projectStatus: Project["status"];
};

const documentCategories = [
  "TODOS",
  "DOCUMENTACAO",
  "ARQUITETONICO",
  "ELETRICO",
  "HIDRAULICO",
  "PROJETO_2D",
  "PROJETO_3D",
  "CAD",
  "REVIT",
  "OUTRO",
];

export function DocumentsView({ actorUserId, projects }: DocumentsViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("todos");
  const [category, setCategory] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadDocuments() {
    setIsLoading(true);
    setMessage(null);
    const loaded = await Promise.allSettled(
      projects.map(async (project) => {
        const files = await engflowApi.listFiles(project.id, actorUserId);
        return files.map((file) => ({
          ...file,
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
        }));
      }),
    );
    const fulfilled = loaded
      .filter((result): result is PromiseFulfilledResult<ProjectDocument[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);
    const failed = loaded.filter((result) => result.status === "rejected").length;

    setDocuments(fulfilled);
    if (failed > 0) {
      setMessage(getApiErrorMessage(undefined, `${failed} obra${failed > 1 ? "s" : ""} nao retornou documentos agora.`));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadDocuments();
  }, [actorUserId, projects.map((project) => project.id).join("|")]);

  const filtered = useMemo(
    () =>
      documents.filter((document) => {
        const matchesProject = selectedProjectId === "todos" || document.projectId === selectedProjectId;
        const matchesCategory = category === "TODOS" || document.category === category;
        const haystack = `${document.name} ${document.category} ${document.folderPath ?? ""} ${document.tags ?? ""} ${document.projectName}`.toLowerCase();
        return matchesProject && matchesCategory && haystack.includes(search.toLowerCase());
      }),
    [documents, selectedProjectId, category, search],
  );

  const completedDocuments = filtered.filter((document) => document.projectStatus === "Concluida").length;
  const folders = new Set(filtered.map((document) => document.folderPath ?? "projetos")).size;

  return (
    <section className="grid gap-6">
      <div className="panel rounded-[2rem] p-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              Acervo tecnico
            </p>
            <h2 className="text-3xl font-black tracking-tight">Documentos por obra</h2>
            <p className="muted mt-2 max-w-3xl">
              Arquitetos e engenheiros podem consultar projetos, contratos, relatorios e arquivos tecnicos por obra, inclusive depois da conclusao.
            </p>
          </div>
          <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold" type="button" onClick={() => void loadDocuments()}>
            <FileSearch size={18} />
            Atualizar acervo
          </button>
        </div>

        {message && <p className="mb-4 rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{message}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <Stat title="Documentos" value={String(filtered.length)} detail={isLoading ? "carregando" : "filtrados"} />
          <Stat title="Obras concluidas" value={String(completedDocuments)} detail="documentos preservados" />
          <Stat title="Pastas" value={String(folders)} detail="organizacao" />
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_0.72fr_0.72fr]">
          <label className="input-shell flex items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="subtle" size={18} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, tag, pasta ou obra"
            />
          </label>
          <select className="input-shell rounded-2xl px-4 py-3 font-bold" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
            <option value="todos">Todas as obras</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.status}
              </option>
            ))}
          </select>
          <select className="input-shell rounded-2xl px-4 py-3 font-bold" value={category} onChange={(event) => setCategory(event.target.value)}>
            {documentCategories.map((item) => (
              <option key={item} value={item}>
                {item === "TODOS" ? "Todos os tipos" : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {filtered.map((document) => (
          <article className="panel rounded-[2rem] p-5" key={`${document.projectId}-${document.id}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="surface-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                  <FileArchive className="text-[var(--accent-strong)]" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black">{document.name}</h3>
                  <p className="muted mt-1 text-sm">{document.projectName}</p>
                </div>
              </div>
              <span className={`badge rounded-full px-3 py-1 text-xs font-black ${document.projectStatus === "Concluida" ? "badge-accent" : ""}`}>
                {document.projectStatus}
              </span>
            </div>
            <div className="grid gap-2 text-sm">
              <InfoLine label="Tipo" value={document.category} />
              <InfoLine label="Pasta" value={document.folderPath ?? "projetos"} />
              <InfoLine label="Tags" value={document.tags || "Sem tags"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a className="btn-primary flex items-center gap-2 px-4 py-3 text-sm font-bold" href={document.fileUrl} target="_blank" rel="noreferrer">
                <FolderKanban size={16} />
                Abrir
              </a>
              <a className="btn-secondary flex items-center gap-2 px-4 py-3 text-sm font-bold" href={document.fileUrl} download={document.name}>
                <Download size={16} />
                Baixar
              </a>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <section className="panel rounded-[2rem] p-8 text-center">
          <FileArchive className="subtle mx-auto" size={36} />
          <h3 className="mt-3 text-xl font-black">Nenhum documento encontrado</h3>
          <p className="muted mt-2">Ajuste os filtros ou envie arquivos na aba Projetos da obra.</p>
        </section>
      )}
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-2xl px-3 py-2">
      <span className="muted text-xs font-black uppercase">{label}</span>
      <p className="mt-1 truncate font-bold">{value}</p>
    </div>
  );
}
