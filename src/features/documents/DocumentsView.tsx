import {
  ArrowLeft,
  Download,
  FileArchive,
  FilePlus2,
  FileSearch,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  Paperclip,
  Search,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Stat } from "../../components";
import type { Project, ProjectFile } from "../../types";
import { fileToDataUrl } from "../../utils/files";

type DocumentsViewProps = {
  actorUserId: string;
  projects: Project[];
};

type ProjectDocument = ProjectFile & {
  projectId: string;
  projectName: string;
  projectStatus: Project["status"];
};

type DocumentFolder = {
  id: string;
  projectId: string;
  projectName: string;
  projectStatus: Project["status"];
  folder: string;
  count: number;
};

const folderContentType = "application/x-engflow-folder";
const documentCategories = ["DOCUMENTACAO", "ARQUITETONICO", "ELETRICO", "HIDRAULICO", "PROJETO_2D", "PROJETO_3D", "CAD", "REVIT", "OUTRO"];
const labelColors = [
  { label: "Verde", value: "#14b8a6" },
  { label: "Azul", value: "#2563eb" },
  { label: "Roxo", value: "#7c3aed" },
  { label: "Amarelo", value: "#f59e0b" },
  { label: "Vermelho", value: "#f43f5e" },
  { label: "Cinza", value: "#64748b" },
];

export function DocumentsView({ actorUserId, projects }: DocumentsViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("todos");
  const [search, setSearch] = useState("");
  const [folderProjectId, setFolderProjectId] = useState(projects[0]?.id ?? "");
  const [folderName, setFolderName] = useState("");
  const [activeFolder, setActiveFolder] = useState<DocumentFolder | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    fileUrl: "",
    contentType: "",
    category: "DOCUMENTACAO",
    tag: "",
    labelColor: labelColors[0].value,
  });

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

  useEffect(() => {
    if (!folderProjectId && projects[0]?.id) {
      setFolderProjectId(projects[0].id);
    }
  }, [folderProjectId, projects]);

  const folders = useMemo(() => {
    const folderMarkers = documents.filter((document) => document.contentType === folderContentType);
    return folderMarkers
      .filter((folder) => {
        const matchesProject = selectedProjectId === "todos" || folder.projectId === selectedProjectId;
        const haystack = `${folder.name} ${folder.folderPath ?? ""} ${folder.projectName}`.toLowerCase();
        return matchesProject && haystack.includes(search.toLowerCase());
      })
      .map((folder) => {
        const folderName = folder.folderPath || folder.name;
        const count = documents.filter(
          (document) =>
            document.projectId === folder.projectId &&
            document.contentType !== folderContentType &&
            document.folderPath === folderName,
        ).length;
        return {
          id: folder.id,
          projectId: folder.projectId,
          projectName: folder.projectName,
          projectStatus: folder.projectStatus,
          folder: folderName,
          count,
        };
      });
  }, [documents, selectedProjectId, search]);

  const folderFiles = useMemo(() => {
    if (!activeFolder) return [];
    return documents.filter(
      (document) =>
        document.projectId === activeFolder.projectId &&
        document.contentType !== folderContentType &&
        document.folderPath === activeFolder.folder,
    );
  }, [documents, activeFolder]);

  const completedFolders = folders.filter((folder) => folder.projectStatus === "Concluida").length;

  async function createDocumentFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderProjectId || !folderName.trim()) return;
    const name = folderName.trim();
    try {
      await engflowApi.addFile(folderProjectId, {
        actorUserId,
        category: "DOCUMENTACAO",
        name,
        fileUrl: `engflow-folder://${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`,
        contentType: folderContentType,
        folderPath: name,
        tags: "pasta documental",
        labelColor: labelColors[0].value,
      });
      setFolderName("");
      setMessage("Pasta documental criada.");
      await loadDocuments();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel criar a pasta documental."));
    }
  }

  async function handleUploadFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadForm({
      ...uploadForm,
      name: uploadForm.name || file.name,
      fileUrl: await fileToDataUrl(file),
      contentType: file.type || "application/octet-stream",
    });
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFolder || !uploadForm.fileUrl || !uploadForm.name.trim()) return;
    try {
      await engflowApi.addFile(activeFolder.projectId, {
        actorUserId,
        category: uploadForm.category,
        name: uploadForm.name.trim(),
        fileUrl: uploadForm.fileUrl,
        contentType: uploadForm.contentType,
        folderPath: activeFolder.folder,
        tags: uploadForm.tag.trim(),
        labelColor: uploadForm.labelColor,
      });
      setUploadForm({
        name: "",
        fileUrl: "",
        contentType: "",
        category: "DOCUMENTACAO",
        tag: "",
        labelColor: labelColors[0].value,
      });
      setMessage("Arquivo enviado para a pasta.");
      await loadDocuments();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel enviar o arquivo."));
    }
  }

  if (activeFolder) {
    return (
      <section className="grid gap-6">
        <div className="panel rounded-[2rem] p-5">
          <button className="btn-secondary mb-5 flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={() => setActiveFolder(null)}>
            <ArrowLeft size={16} />
            Voltar para pastas
          </button>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
                Pasta documental
              </p>
              <h2 className="text-3xl font-black tracking-tight">{activeFolder.folder}</h2>
              <p className="muted mt-2">{activeFolder.projectName} | {activeFolder.projectStatus}</p>
            </div>
            <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold" type="button" onClick={() => void loadDocuments()}>
              <FileSearch size={18} />
              Atualizar pasta
            </button>
          </div>
        </div>

        {message && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{message}</p>}

        <form className="panel rounded-[2rem] p-5" onSubmit={uploadDocument}>
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="text-[var(--accent-strong)]" size={22} />
            <div>
              <h3 className="text-xl font-black">Upload de arquivo</h3>
              <p className="muted mt-1 text-sm">Adicione documento com nome, tipo e etiqueta visual dentro desta pasta.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="surface-soft flex cursor-pointer flex-col items-center justify-center rounded-3xl border-dashed p-5 text-center lg:row-span-2">
              <Paperclip className="text-[var(--accent-strong)]" size={28} />
              <span className="mt-2 font-black">{uploadForm.fileUrl ? "Arquivo selecionado" : "Escolher arquivo"}</span>
              <span className="muted mt-1 text-sm">{uploadForm.name || "PDF, DOCX, imagem, planilha, projeto ou contrato"}</span>
              <input className="sr-only" type="file" onChange={handleUploadFileSelect} />
            </label>
            <input
              className="input-shell rounded-2xl px-4 py-3"
              value={uploadForm.name}
              onChange={(event) => setUploadForm({ ...uploadForm, name: event.target.value })}
              placeholder="Nome do arquivo"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="input-shell rounded-2xl px-4 py-3 font-bold sm:col-span-1" value={uploadForm.category} onChange={(event) => setUploadForm({ ...uploadForm, category: event.target.value })}>
                {documentCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                className="input-shell rounded-2xl px-4 py-3 sm:col-span-1"
                value={uploadForm.tag}
                onChange={(event) => setUploadForm({ ...uploadForm, tag: event.target.value })}
                placeholder="Etiqueta"
              />
              <select className="input-shell rounded-2xl px-4 py-3 font-bold sm:col-span-1" value={uploadForm.labelColor} onChange={(event) => setUploadForm({ ...uploadForm, labelColor: event.target.value })}>
                {labelColors.map((color) => (
                  <option key={color.value} value={color.value}>{color.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60 sm:w-fit" disabled={!uploadForm.fileUrl || !uploadForm.name.trim()}>
            <FilePlus2 size={18} />
            Enviar para pasta
          </button>
        </form>

        <section className="grid gap-4 xl:grid-cols-3">
          {folderFiles.map((document) => (
            <DocumentCard document={document} key={`${document.projectId}-${document.id}`} />
          ))}
        </section>

        {folderFiles.length === 0 && (
          <section className="panel rounded-[2rem] p-8 text-center">
            <FileArchive className="subtle mx-auto" size={36} />
            <h3 className="mt-3 text-xl font-black">Pasta vazia</h3>
            <p className="muted mt-2">Envie o primeiro arquivo documental usando o formulario acima.</p>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="panel rounded-[2rem] p-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              Acervo tecnico
            </p>
            <h2 className="text-3xl font-black tracking-tight">Documentacao por obra</h2>
            <p className="muted mt-2 max-w-3xl">
              Organize documentos dentro de pastas por obra. Arquivos soltos de projetos nao aparecem aqui.
            </p>
          </div>
          <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold" type="button" onClick={() => void loadDocuments()}>
            <FileSearch size={18} />
            Atualizar acervo
          </button>
        </div>

        {message && <p className="mb-4 rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{message}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <Stat title="Pastas" value={String(folders.length)} detail={isLoading ? "carregando" : "documentais"} />
          <Stat title="Arquivadas" value={String(completedFolders)} detail="obras concluidas" />
          <Stat title="Arquivos em pastas" value={String(folders.reduce((total, folder) => total + folder.count, 0))} detail="documentos organizados" />
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_0.72fr]">
          <label className="input-shell flex items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="subtle" size={18} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar pasta ou obra"
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
        </div>
      </div>

      <form className="panel rounded-[2rem] p-5" onSubmit={createDocumentFolder}>
        <div className="mb-4 flex items-center gap-2">
          <FolderPlus className="text-[var(--accent-strong)]" size={22} />
          <div>
            <h3 className="text-xl font-black">Criar pasta documental</h3>
            <p className="muted mt-1 text-sm">A pasta fica vinculada ao projeto e permanece visivel quando a obra for arquivada.</p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[0.9fr_1fr_auto]">
          <select className="input-shell rounded-2xl px-4 py-3 font-bold" value={folderProjectId} onChange={(event) => setFolderProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.status}
              </option>
            ))}
          </select>
          <input
            className="input-shell rounded-2xl px-4 py-3"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Nome da pasta, ex.: Contratos assinados"
          />
          <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60" disabled={!folderProjectId || !folderName.trim()}>
            <FilePlus2 size={18} />
            Criar pasta
          </button>
        </div>
      </form>

      <section className="grid gap-4 xl:grid-cols-3">
        {folders.map((folder) => (
          <button className="panel rounded-[2rem] p-5 text-left transition hover:-translate-y-1 hover:border-[var(--border-strong)]" key={folder.id} type="button" onClick={() => setActiveFolder(folder)}>
            <div className="mb-4 flex items-start gap-3">
              <div className="surface-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                <FolderOpen className="text-[var(--accent-strong)]" size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black">{folder.folder}</h3>
                <p className="muted mt-1 text-sm">{folder.projectName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge rounded-full px-3 py-1 text-xs font-black">{folder.projectStatus}</span>
              <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">{folder.count} arquivo{folder.count === 1 ? "" : "s"}</span>
            </div>
          </button>
        ))}
      </section>

      {folders.length === 0 && (
        <section className="panel rounded-[2rem] p-8 text-center">
          <FolderKanban className="subtle mx-auto" size={36} />
          <h3 className="mt-3 text-xl font-black">Nenhuma pasta documental</h3>
          <p className="muted mt-2">Crie uma pasta para comecar a organizar documentos por obra.</p>
        </section>
      )}
    </section>
  );
}

function DocumentCard({ document }: { document: ProjectDocument }) {
  const color = document.labelColor || "#14b8a6";

  return (
    <article className="panel rounded-[2rem] p-5">
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
        {document.tags && (
          <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: color }}>
            {document.tags}
          </span>
        )}
      </div>
      <div className="grid gap-2 text-sm">
        <InfoLine label="Tipo" value={document.category} />
        <InfoLine label="Pasta" value={document.folderPath ?? "Sem pasta"} />
        <InfoLine label="Status da obra" value={document.projectStatus} />
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
