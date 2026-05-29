import {
  ArrowLeft,
  BookOpenText,
  Box,
  MessageCircle,
  ListChecks,
  MapPinned,
  CalendarDays,
  FileText,
  FileStack,
  FileUp,
  Gauge,
  BrainCircuit,
  ImagePlus,
  Images,
  Maximize2,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  RotateCw,
  Save,
  UploadCloud,
  UserPlus,
  Video,
  Users,
  WalletCards,
  X,
  ZoomIn,
} from "lucide-react";
import { ChangeEvent, Component, FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field, ProgressBar, Stat } from "../../components";
import { apiRoleLabels, projectStatuses } from "../../constants/labels";
import { TicketsView } from "../tickets/TicketsView";
import { UpdatesView } from "../updates/UpdatesView";
import { SuppliesView } from "../supplies/SuppliesView";
import { DailyLogsView } from "../dailyLogs/DailyLogsView";
import { ProjectChatView } from "../chat/ProjectChatView";
import { ChecklistView } from "../checklist/ChecklistView";
import { ProjectMapView } from "../map/ProjectMapView";
import { BeforeAfterView } from "../evolution/BeforeAfterView";
import { VideosView } from "../videos/VideosView";
import { SmartEngineeringHub } from "./SmartEngineeringHub";
import { ProjectAiReportView } from "./ProjectAiReportView";
import type { Project, ProjectFile, ProjectMember, Role } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { formatCpf, isValidCpf, money } from "../../utils/format";

export type ProjectTab = "visao" | "relatorio" | "inteligencia" | "projetos" | "chat" | "chamados" | "checklist" | "atualizacoes" | "diario" | "financeiro" | "insumos" | "mapa" | "evolucao" | "videos";

type ProjectDetailProps = {
  actorUserId: string;
  project: Project;
  canManage: boolean;
  isWorker: boolean;
  isClient: boolean;
  initialTab?: ProjectTab;
  onRefreshProjects: () => Promise<void>;
  onRefreshNotifications: () => Promise<void>;
  onCompleteProject?: (project: Project) => Promise<void>;
  onDeleteProject?: (project: Project) => Promise<void>;
  onBack: () => void;
};

const tabs: { id: ProjectTab; label: string; icon: typeof Gauge }[] = [
  { id: "visao", label: "Visao Geral", icon: Gauge },
  { id: "relatorio", label: "Relatorio IA", icon: FileText },
  { id: "inteligencia", label: "IA + BIM", icon: BrainCircuit },
  { id: "projetos", label: "Projetos", icon: FileStack },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "chamados", label: "Chamados Tecnicos", icon: Box },
  { id: "checklist", label: "Checklist", icon: ListChecks },
  { id: "atualizacoes", label: "Atualizacoes", icon: CalendarDays },
  { id: "diario", label: "Diario de Obra", icon: BookOpenText },
  { id: "financeiro", label: "Financeiro", icon: WalletCards },
  { id: "insumos", label: "Insumos", icon: FileUp },
  { id: "mapa", label: "Mapa", icon: MapPinned },
  { id: "evolucao", label: "Antes/Depois", icon: Images },
  { id: "videos", label: "Videos", icon: Video },
];

const fileCategories = [
  "PROJETO_3D",
  "PROJETO_2D",
  "ARQUITETONICO",
  "ELETRICO",
  "HIDRAULICO",
  "PLANTA_BAIXA",
  "CAD",
  "REVIT",
  "DOCUMENTACAO",
  "OUTRO",
];

const folderOptions = [
  { label: "Projetos", value: "projetos" },
  { label: "Contratos", value: "contratos" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Fotos", value: "fotos" },
  { label: "Videos", value: "videos" },
  { label: "Relatorios", value: "relatorios" },
  { label: "Diario de obra", value: "diario-obra" },
];

const ThreeModelViewer = lazy(() =>
  import("./ThreeModelViewer").then((module) => ({ default: module.ThreeModelViewer })),
);

export function ProjectDetail({
  actorUserId,
  project,
  canManage,
  isWorker,
  isClient,
  initialTab = "visao",
  onRefreshProjects,
  onRefreshNotifications,
  onCompleteProject,
  onDeleteProject,
  onBack,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [invite, setInvite] = useState({ cpf: "", role: "cliente" as Role });
  const [fileForm, setFileForm] = useState({
    name: "",
    fileUrl: "",
    category: "PROJETO_3D",
    contentType: "",
    tags: "",
    folderPath: "projetos",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? files[0],
    [files, selectedFileId],
  );

  async function loadDetail() {
    const [loadedFiles, loadedMembers] = await Promise.all([
      engflowApi.listFiles(project.id, actorUserId),
      engflowApi.listMembers(project.id, actorUserId),
    ]);
    setFiles(loadedFiles);
    setMembers(loadedMembers);
    setSelectedFileId((current) => {
      if (current && loadedFiles.some((file) => file.id === current)) return current;
      return loadedFiles[0]?.id ?? null;
    });
  }

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, project.id]);

  useEffect(() => {
    loadDetail().catch(() => setMessage("Nao foi possivel carregar os detalhes da obra."));
  }, [project.id, actorUserId]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!isValidCpf(invite.cpf)) {
        setMessage("CPF invalido.");
        return;
      }
      const response = await engflowApi.inviteMember(project.id, {
        actorUserId,
        cpf: invite.cpf,
        role: invite.role,
      });
      setMessage(`Convite criado: ${response.inviteLink}`);
      setShowInviteForm(false);
      setInvite({ cpf: "", role: "cliente" });
      await loadDetail();
      await onRefreshNotifications();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel convidar."));
    }
  }

  async function handleAddFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await engflowApi.addFile(project.id, {
        actorUserId,
        ...fileForm,
      });
      setFileForm({ name: "", fileUrl: "", category: "PROJETO_3D", contentType: "", tags: "", folderPath: "projetos" });
      setMessage("Arquivo registrado.");
      await loadDetail();
    } catch {
      setMessage("Nao foi possivel registrar o arquivo.");
    }
  }

  async function handleProjectFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileForm({
      ...fileForm,
      name: fileForm.name || file.name,
      fileUrl: await fileToDataUrl(file),
      contentType: file.type,
    });
  }

  return (
    <div className="space-y-6">
      <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" onClick={onBack}>
        <ArrowLeft size={17} />
        Voltar
      </button>

      <section className="panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row">
            {project.photoUrl && (
              <img
                className="h-28 w-full rounded-2xl object-cover md:w-44"
                src={project.photoUrl}
                alt={project.name}
              />
            )}
            <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="badge-accent rounded-full px-3 py-1 text-xs font-black uppercase">{project.status}</span>
              <span className="badge rounded-full px-3 py-1 text-xs font-bold">{project.deadline}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{project.name}</h2>
            <p className="muted mt-2 max-w-3xl">{project.address}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary flex items-center gap-2 px-4 py-3 font-bold" onClick={() => setActiveTab("relatorio")}>
              <FileText size={18} />
              Relatorio IA
            </button>
            <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" onClick={() => setActiveTab("projetos")}>
              <FileStack size={18} />
              Projetos 3D
            </button>
            {canManage && (
              <>
                {project.status !== "Concluida" && (
                  <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" onClick={() => void onCompleteProject?.(project)}>
                    <Save size={18} />
                    Concluir obra
                  </button>
                )}
                <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold text-rose-600" onClick={() => void onDeleteProject?.(project)}>
                  <X size={18} />
                  Excluir obra
                </button>
                <button className="btn-primary flex items-center gap-2 px-4 py-3 font-bold" onClick={() => setShowInviteForm(true)}>
                  <UserPlus size={18} />
                  Adicionar colaborador
                </button>
              </>
            )}
            <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" onClick={onRefreshProjects}>
              <RotateCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        <label className="mt-6 block lg:hidden">
          <span className="muted mb-2 block text-sm font-bold">Area da obra</span>
          <select
            className="input-shell rounded-2xl px-4 py-3 font-bold"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value as ProjectTab)}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={`tab-button flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                  activeTab === tab.id ? "active" : ""
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {message && <p className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-3 font-semibold text-teal-600">{message}</p>}

      {activeTab === "visao" && (
        <OverviewTab
          project={project}
          members={members}
          canManage={canManage}
          showInviteForm={showInviteForm}
          invite={invite}
          setInvite={setInvite}
          setShowInviteForm={setShowInviteForm}
          onInvite={handleInvite}
          actorUserId={actorUserId}
          onRefreshProjects={onRefreshProjects}
        />
      )}

      {activeTab === "relatorio" && (
        <ProjectAiReportView
          actorUserId={actorUserId}
          project={project}
        />
      )}

      {activeTab === "inteligencia" && (
        <SmartEngineeringHub
          project={project}
          files={files}
          canManage={canManage}
        />
      )}

      {activeTab === "projetos" && (
        <ProjectsTab
          canManage={canManage}
          files={files}
          fileForm={fileForm}
          selectedFile={selectedFile}
          setFileForm={setFileForm}
          setSelectedFileId={setSelectedFileId}
          onFileSelect={handleProjectFileSelect}
          onAddFile={handleAddFile}
        />
      )}

      {activeTab === "chamados" && (
        <TicketsView
          actorUserId={actorUserId}
          projectId={project.id}
          canRespond={canManage}
          canCreate={isWorker || isClient}
          onRefreshNotifications={onRefreshNotifications}
        />
      )}

      {activeTab === "chat" && (
        <ProjectChatView
          actorUserId={actorUserId}
          projectId={project.id}
        />
      )}

      {activeTab === "checklist" && (
        <ChecklistView
          actorUserId={actorUserId}
          projectId={project.id}
          canPlan={canManage}
          canConfirm={isWorker}
        />
      )}

      {activeTab === "atualizacoes" && (
        <UpdatesView
          actorUserId={actorUserId}
          projectId={project.id}
          canCreate={isWorker || canManage}
          isClient={isClient}
        />
      )}

      {activeTab === "diario" && (
        <DailyLogsView
          actorUserId={actorUserId}
          projectId={project.id}
          canCreate={!isClient}
        />
      )}

      {activeTab === "financeiro" && (
        <FinanceTab
          actorUserId={actorUserId}
          canManage={canManage}
          project={project}
          onRefreshProjects={onRefreshProjects}
        />
      )}

      {activeTab === "insumos" && (
        <SuppliesView actorUserId={actorUserId} projectId={project.id} canCreate={isWorker} canApprove={isClient} />
      )}

      {activeTab === "mapa" && (
        <ProjectMapView project={project} />
      )}

      {activeTab === "evolucao" && (
        <BeforeAfterView
          actorUserId={actorUserId}
          projectId={project.id}
          canCreate={!isClient}
        />
      )}

      {activeTab === "videos" && (
        <VideosView />
      )}
    </div>
  );
}

type OverviewTabProps = {
  actorUserId: string;
  project: Project;
  members: ProjectMember[];
  canManage: boolean;
  showInviteForm: boolean;
  invite: { cpf: string; role: Role };
  setInvite: (invite: { cpf: string; role: Role }) => void;
  setShowInviteForm: (show: boolean) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshProjects: () => Promise<void>;
};

function OverviewTab({
  actorUserId,
  project,
  members,
  canManage,
  showInviteForm,
  invite,
  setInvite,
  setShowInviteForm,
  onInvite,
  onRefreshProjects,
}: OverviewTabProps) {
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: project.name,
    address: project.address,
    photoUrl: project.photoUrl ?? "",
    status: project.status,
    progressPercent: String(project.progress),
    startDate: project.start ?? "",
    expectedEndDate: project.deadline === "Sem prazo" ? "" : project.deadline,
  });
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const today = new Date();
  const startDate = project.start ? new Date(`${project.start}T00:00:00`) : null;
  const endDate = project.deadline !== "Sem prazo" ? new Date(`${project.deadline}T00:00:00`) : null;
  const totalDays = startDate && endDate ? Math.max(1, daysBetween(startDate, endDate)) : null;
  const elapsedDays = startDate ? Math.max(0, daysBetween(startDate, today)) : null;
  const remainingDays = endDate ? daysBetween(today, endDate) : null;
  const expectedProgress = totalDays && elapsedDays !== null
    ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
    : null;
  const scheduleDelta = expectedProgress === null ? null : project.progress - expectedProgress;
  const phase = phaseForProgress(project.progress);
  const spentRatio = project.charged > 0 ? Math.round((project.spent / project.charged) * 100) : null;

  useEffect(() => {
    setProjectForm({
      name: project.name,
      address: project.address,
      photoUrl: project.photoUrl ?? "",
      status: project.status,
      progressPercent: String(project.progress),
      startDate: project.start ?? "",
      expectedEndDate: project.deadline === "Sem prazo" ? "" : project.deadline,
    });
  }, [project]);

  async function handleProjectPhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProjectForm({ ...projectForm, photoUrl: await fileToDataUrl(file) });
  }

  async function handleProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await engflowApi.updateProject(project.id, {
        actorUserId,
        name: projectForm.name,
        address: projectForm.address,
        photoUrl: projectForm.photoUrl || undefined,
        status: projectForm.status,
        progressPercent: Number(projectForm.progressPercent),
        startDate: projectForm.startDate || undefined,
        expectedEndDate: projectForm.expectedEndDate || undefined,
      });
      setProjectMessage("Dados da obra atualizados.");
      setIsEditingProject(false);
      await onRefreshProjects();
    } catch (error) {
      setProjectMessage(getApiErrorMessage(error, "Nao foi possivel atualizar a obra."));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat title="Total gasto" value={money(project.spent)} detail="custos lancados" />
          <Stat title="Investido" value={money(project.invested)} detail="entrada do cliente" />
          <Stat title="Cobrado" value={money(project.charged)} detail="valor comercial" />
          <Stat title="Entrega" value={project.deadline} detail="previsao final" />
        </div>

        <section className="panel rounded-[2rem] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Andamento da obra</h3>
              <p className="muted mt-1 text-sm">Cronograma, progresso e saude financeira.</p>
            </div>
            <span className="badge-accent rounded-full px-3 py-1 text-sm font-black">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.78fr]">
            <div className="surface-soft rounded-3xl p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="muted text-sm font-black uppercase">Leitura operacional</p>
                  <h4 className="mt-1 text-xl font-black">{phase.title}</h4>
                  <p className="muted mt-1 text-sm leading-6">{phase.detail}</p>
                </div>
                <span className={`badge rounded-full px-3 py-1 text-xs font-black ${scheduleDelta !== null && scheduleDelta >= 0 ? "badge-accent" : ""}`}>
                  {scheduleDelta === null
                    ? "Sem linha de base"
                    : scheduleDelta >= 0
                      ? `${scheduleDelta}% adiantado`
                      : `${Math.abs(scheduleDelta)}% atrasado`}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniInsight label="Execucao restante" value={`${Math.max(0, 100 - project.progress)}%`} />
                <MiniInsight
                  label="Prazo restante"
                  value={remainingDays === null ? "Sem prazo" : remainingDays < 0 ? `${Math.abs(remainingDays)}d atraso` : `${remainingDays}d`}
                />
                <MiniInsight label="Custo/contrato" value={spentRatio === null ? "Sem valor" : `${spentRatio}%`} />
              </div>

              <div className="mt-5 grid gap-4">
                <ProgressComparison label="Progresso atual" value={project.progress} tone="actual" />
                {expectedProgress !== null && <ProgressComparison label="Progresso esperado pelo prazo" value={expectedProgress} tone="expected" />}
                {spentRatio !== null && <ProgressComparison label="Consumo financeiro" value={Math.min(100, spentRatio)} tone="money" />}
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-black">Proxima acao sugerida</p>
                <p className="muted mt-1 text-sm leading-6">{nextActionForProject(project.progress, remainingDays, spentRatio)}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <TimelineItem title="Inicio" value={project.start ?? "Sem data"} />
              <TimelineItem title="Status" value={project.status} />
              <TimelineItem title="Previsao" value={project.deadline} />
            </div>
          </div>
        </section>

        {canManage && (
          <section className="panel rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">Dados da obra</h3>
                <p className="muted mt-1 text-sm">Atualize foto, status, datas, progresso e endereco.</p>
              </div>
              <button
                className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold"
                type="button"
                onClick={() => setIsEditingProject((current) => !current)}
              >
                {isEditingProject ? <X size={16} /> : <Pencil size={16} />}
                {isEditingProject ? "Fechar" : "Editar"}
              </button>
            </div>
            {projectMessage && (
              <p className="mb-4 rounded-2xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">
                {projectMessage}
              </p>
            )}
            {isEditingProject ? (
              <form className="grid gap-3" onSubmit={handleProjectUpdate}>
                <label className="surface-soft cursor-pointer overflow-hidden rounded-2xl border-dashed">
                  {projectForm.photoUrl ? (
                    <img className="h-44 w-full object-cover" src={projectForm.photoUrl} alt="Foto da obra" />
                  ) : (
                    <span className="flex flex-col items-center justify-center px-5 py-8 text-center">
                      <ImagePlus className="text-[var(--accent-strong)]" size={28} />
                      <span className="mt-2 font-black">Adicionar foto</span>
                    </span>
                  )}
                  <input className="sr-only" type="file" accept="image/*" onChange={handleProjectPhotoSelect} />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Nome da obra" value={projectForm.name} onChange={(value) => setProjectForm({ ...projectForm, name: value })} />
                  <Field label="Endereco" value={projectForm.address} onChange={(value) => setProjectForm({ ...projectForm, address: value })} />
                  <label className="block">
                    <span className="muted mb-2 block text-sm font-semibold">Status</span>
                    <select
                      className="input-shell rounded-xl px-4 py-3"
                      value={projectForm.status}
                      onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value as Project["status"] })}
                    >
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Progresso %" type="number" value={projectForm.progressPercent} onChange={(value) => setProjectForm({ ...projectForm, progressPercent: value })} />
                  <Field label="Data de inicio" type="date" value={projectForm.startDate} onChange={(value) => setProjectForm({ ...projectForm, startDate: value })} />
                  <Field label="Previsao final" type="date" value={projectForm.expectedEndDate} onChange={(value) => setProjectForm({ ...projectForm, expectedEndDate: value })} />
                </div>
                <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold">
                  <Save size={18} />
                  Salvar dados da obra
                </button>
              </form>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <TimelineItem title="Status" value={project.status} />
                <TimelineItem title="Progresso" value={`${project.progress}%`} />
                <TimelineItem title="Inicio" value={project.start ?? "Sem data"} />
              </div>
            )}
          </section>
        )}
      </div>

      <section className="panel rounded-[2rem] p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Colaboradores</h3>
            <p className="muted mt-1 text-sm">{members.length} vinculado{members.length === 1 ? "" : "s"}</p>
          </div>
          <Users className="subtle" size={22} />
        </div>
        <div className="grid gap-3">
          {members.map((member) => (
            <div className="panel-flat rounded-2xl p-4" key={member.id}>
              <p className="font-black">{member.fullName}</p>
              <p className="muted mt-1 text-sm">
                {apiRoleLabels[member.role]} | CPF {formatCpf(member.cpf)}
              </p>
            </div>
          ))}
          {members.length === 0 && <EmptyLine text="Nenhum colaborador vinculado." />}
        </div>

        {canManage && showInviteForm && (
          <form className="surface-soft mt-5 grid gap-3 rounded-3xl p-4" onSubmit={onInvite}>
            <h4 className="font-black">Convidar por CPF</h4>
            <Field
              label="CPF"
              value={invite.cpf}
              onChange={(value) => setInvite({ ...invite, cpf: formatCpf(value) })}
              placeholder="000.000.000-00"
            />
            <label className="block">
              <span className="muted mb-2 block text-sm font-semibold">Funcao</span>
              <select
                className="input-shell rounded-xl px-4 py-3"
                value={invite.role}
                onChange={(event) => setInvite({ ...invite, role: event.target.value as Role })}
              >
                <option value="cliente">Cliente</option>
                <option value="pedreiro">Pedreiro</option>
                <option value="arquiteto">Arquiteto</option>
                <option value="engenheiro">Engenheiro</option>
              </select>
            </label>
            <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold">
              <UserPlus size={18} />
              Enviar convite
            </button>
          </form>
        )}
        {canManage && !showInviteForm && (
          <button className="btn-secondary mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 font-bold" onClick={() => setShowInviteForm(true)}>
            <UserPlus size={18} />
            Adicionar colaborador por CPF
          </button>
        )}
      </section>
    </div>
  );
}

type ProjectsTabProps = {
  canManage: boolean;
  files: ProjectFile[];
  fileForm: { name: string; fileUrl: string; category: string; contentType: string; tags: string; folderPath: string };
  selectedFile?: ProjectFile;
  setFileForm: (form: { name: string; fileUrl: string; category: string; contentType: string; tags: string; folderPath: string }) => void;
  setSelectedFileId: (id: string) => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddFile: (event: FormEvent<HTMLFormElement>) => void;
};

function ProjectsTab({
  canManage,
  files,
  fileForm,
  selectedFile,
  setFileForm,
  setSelectedFileId,
  onFileSelect,
  onAddFile,
}: ProjectsTabProps) {
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const filteredFiles = files.filter((file) => {
    const haystack = `${file.name} ${file.category} ${file.tags ?? ""} ${file.folderPath ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.7fr_1fr]">
      <section className="panel rounded-[2rem] p-5">
        <h3 className="text-xl font-black">Biblioteca de projetos</h3>
        {canManage && (
          <form className="mt-5 grid gap-3" onSubmit={onAddFile}>
            <div className="surface-soft rounded-3xl border-dashed p-5 text-center">
              <UploadCloud className="mx-auto text-[var(--accent-strong)]" size={28} />
              <p className="mt-3 font-black">Upload do computador</p>
              <p className="muted mt-1 text-sm">Selecione o arquivo tecnico no documento do computador.</p>
              <label className="btn-secondary mt-4 inline-flex cursor-pointer items-center gap-2 px-4 py-3 font-bold">
                <Paperclip size={17} />
                Escolher arquivo
                <input
                  className="sr-only"
                  type="file"
                  accept=".dwg,.dxf,.ifc,.rvt,.rfa,.rte,.skp,.layout,.ls,.lsproj,.pln,.pla,.bimx,.lumion,.dae,.fbx,.obj,.gltf,.glb,.3ds,.blend,.nwd,.nwc,.pdf,.zip,image/*"
                  onChange={onFileSelect}
                />
              </label>
              {fileForm.fileUrl && (
                <p className="badge-accent mx-auto mt-3 w-fit rounded-full px-3 py-1 text-xs font-black">
                  {fileForm.name || "Arquivo selecionado"}
                </p>
              )}
            </div>
            <Field
              label="Nome do arquivo"
              value={fileForm.name}
              onChange={(value) => setFileForm({ ...fileForm, name: value })}
              placeholder="Projeto eletrico pavimento 1"
            />
            <label className="block">
              <span className="muted mb-2 block text-sm font-semibold">Tipo</span>
              <select
                className="input-shell rounded-xl px-4 py-3"
                value={fileForm.category}
                onChange={(event) => setFileForm({ ...fileForm, category: event.target.value })}
              >
                {fileCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="muted mb-2 block text-sm font-semibold">Pasta</span>
              <select
                className="input-shell rounded-xl px-4 py-3"
                value={fileForm.folderPath}
                onChange={(event) => setFileForm({ ...fileForm, folderPath: event.target.value })}
              >
                {folderOptions.map((folder) => (
                  <option key={folder.value} value={folder.value}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Tags"
              value={fileForm.tags}
              onChange={(value) => setFileForm({ ...fileForm, tags: value })}
              placeholder="estrutural, revisao, aprovado"
            />
            <button
              className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60"
              disabled={!fileForm.fileUrl}
            >
              <UploadCloud size={18} />
              Registrar arquivo
            </button>
          </form>
        )}

        <div className="mt-5 grid gap-3">
          <Field label="Buscar" value={search} onChange={setSearch} placeholder="Nome, tag ou pasta" />
          {filteredFiles.map((file) => (
            <button
              className={`panel-flat flex items-center justify-between gap-3 rounded-2xl p-4 text-left ${
                selectedFile?.id === file.id ? "ring-2 ring-teal-400/50" : ""
              }`}
              key={file.id}
              onClick={() => setSelectedFileId(file.id)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileUp className="text-[var(--accent-strong)]" size={21} />
                <div className="min-w-0">
                  <p className="truncate font-black">{file.name}</p>
                  <p className="muted text-xs">{file.folderPath ?? "projetos"} | {file.category}</p>
                </div>
              </div>
              <span className="badge rounded-full px-2 py-1 text-xs font-black">Preview</span>
            </button>
          ))}
          {filteredFiles.length === 0 && <EmptyLine text="Nenhum arquivo cadastrado." />}
        </div>
      </section>

      <section className={`panel rounded-[2rem] p-5 ${isFullscreen ? "fixed inset-4 z-50 overflow-auto" : ""}`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">Visualizador integrado</h3>
            <p className="muted mt-1 text-sm">{selectedFile?.name ?? "Selecione um arquivo"}</p>
          </div>
          <div className="flex gap-2">
            <button className="icon-button p-2" title="Zoom out" type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}>
              <Minus size={16} />
            </button>
            <button className="icon-button p-2" title="Zoom in" type="button" onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}>
              <ZoomIn size={16} />
            </button>
            <button className="icon-button p-2" title="Tela cheia" type="button" onClick={() => setIsFullscreen((current) => !current)}>
              {isFullscreen ? <X size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        <div className="viewer-grid flex min-h-[28rem] items-center justify-center overflow-auto rounded-[1.5rem] border border-[var(--border)]">
          {selectedFile ? (
            <FilePreview file={selectedFile} zoom={zoom} />
          ) : (
            <div className="text-center">
              <FileStack className="subtle mx-auto" size={44} />
              <p className="muted mt-3 font-bold">Sem projeto selecionado.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FilePreview({ file, zoom }: { file: ProjectFile; zoom: number }) {
  const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(file.fileUrl) || file.fileUrl.startsWith("data:image") || file.contentType?.startsWith("image/");
  const isPdf = /\.pdf$/i.test(file.fileUrl) || file.contentType === "application/pdf" || file.fileUrl.startsWith("data:application/pdf");
  const isEmbeddable = isImage || isPdf || file.fileUrl.startsWith("http");

  if (isRealtime3dFile(file)) {
    return (
      <ModelViewerBoundary>
        <Suspense fallback={<EmptyLine text="Carregando motor 3D em tempo real..." />}>
          <ThreeModelViewer file={file} zoom={zoom} />
        </Suspense>
      </ModelViewerBoundary>
    );
  }

  if (isImage) {
    return <img className="max-h-[28rem] w-full object-contain transition-transform" style={{ transform: `scale(${zoom})` }} src={file.fileUrl} alt={file.name} />;
  }

  if (isEmbeddable) {
    return <iframe className="h-[28rem] origin-top-left border-0 transition-transform" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }} src={file.fileUrl} title={file.name} />;
  }

  return (
    <div className="text-center">
      <Box className="mx-auto text-[var(--accent-strong)]" size={48} />
      <p className="mt-3 font-black">{file.category}</p>
      <p className="muted mt-1 text-sm">Preview tecnico registrado na plataforma.</p>
      <a className="btn-secondary mt-4 inline-flex px-4 py-3 font-bold" href={file.fileUrl} download={file.name}>
        Baixar arquivo
      </a>
    </div>
  );
}

function isRealtime3dFile(file: ProjectFile) {
  return /\.(fbx|obj|gltf|glb)$/i.test(file.name) || /\.(fbx|obj|gltf|glb)$/i.test(file.fileUrl);
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="muted text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function ProgressComparison({ label, value, tone }: { label: string; value: number; tone: "actual" | "expected" | "money" }) {
  const color =
    tone === "actual"
      ? "linear-gradient(90deg, var(--accent), var(--violet))"
      : tone === "money"
        ? "linear-gradient(90deg, var(--amber), var(--rose))"
        : "linear-gradient(90deg, var(--subtle), var(--muted))";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">{label}</span>
        <span className="muted font-black">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_70%,transparent)]">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function daysBetween(start: Date, end: Date) {
  const day = 1000 * 60 * 60 * 24;
  return Math.ceil((end.getTime() - start.getTime()) / day);
}

function phaseForProgress(progress: number) {
  if (progress >= 100) return { title: "Obra concluida", detail: "Concentre a rotina em entrega, aceite, documentacao final e arquivamento tecnico." };
  if (progress >= 75) return { title: "Reta final", detail: "Priorize acabamentos, pendencias abertas, revisoes finais e checklist de entrega." };
  if (progress >= 45) return { title: "Execucao principal", detail: "Acompanhe produtividade diaria, compras criticas, interferencias e custo acumulado." };
  if (progress >= 15) return { title: "Mobilizacao e base", detail: "Valide equipes, fundacao, documentacao, suprimentos e liberacoes iniciais." };
  return { title: "Planejamento inicial", detail: "Estruture cronograma, responsaveis, documentos obrigatorios e primeiras frentes de servico." };
}

function nextActionForProject(progress: number, remainingDays: number | null, spentRatio: number | null) {
  if (remainingDays !== null && remainingDays < 0) return "Replanejar prazo, registrar justificativa e comunicar responsaveis e cliente.";
  if (spentRatio !== null && spentRatio > progress + 20) return "Revisar custos lancados antes de liberar novas compras ou etapas.";
  if (progress < 15) return "Criar checklist inicial e registrar diario de obra com equipe, clima e primeiras atividades.";
  if (progress < 75) return "Atualizar diario, confirmar materiais da proxima etapa e verificar chamados tecnicos pendentes.";
  if (progress < 100) return "Conferir pendencias finais, documentacao de entrega e fotos de conclusao.";
  return "Manter o acervo documental organizado e mover a obra para Arquivadas.";
}

function FinanceTab({
  actorUserId,
  project,
  canManage,
  onRefreshProjects,
}: {
  actorUserId: string;
  project: Project;
  canManage: boolean;
  onRefreshProjects: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    totalSpent: String(project.spent),
    totalInvested: String(project.invested),
    chargedAmount: String(project.charged),
    materialAmount: String(project.materials),
    laborAmount: String(project.labor),
    documentationAmount: String(project.documentation),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [dailyExpense, setDailyExpense] = useState({
    materialAmount: "",
    laborAmount: "",
    documentationAmount: "",
  });
  const values = [form.totalSpent, form.totalInvested, form.chargedAmount].map((value) => Math.max(1, Number(value) || 1));
  const max = Math.max(...values);

  useEffect(() => {
    setForm({
      totalSpent: String(project.spent),
      totalInvested: String(project.invested),
      chargedAmount: String(project.charged),
      materialAmount: String(project.materials),
      laborAmount: String(project.labor),
      documentationAmount: String(project.documentation),
    });
  }, [project.id, project.spent, project.invested, project.charged, project.materials, project.labor, project.documentation]);

  async function handleFinanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await engflowApi.updateProjectFinance(project.id, {
        actorUserId,
        totalSpent: Number(form.totalSpent),
        totalInvested: Number(form.totalInvested),
        chargedAmount: Number(form.chargedAmount),
        materialAmount: Number(form.materialAmount),
        laborAmount: Number(form.laborAmount),
        documentationAmount: Number(form.documentationAmount),
      });
      setMessage("Financeiro atualizado.");
      await onRefreshProjects();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel atualizar o financeiro."));
    }
  }

  function addDailyExpense() {
    const material = Number(dailyExpense.materialAmount) || 0;
    const labor = Number(dailyExpense.laborAmount) || 0;
    const documentation = Number(dailyExpense.documentationAmount) || 0;
    setForm({
      ...form,
      materialAmount: String((Number(form.materialAmount) || 0) + material),
      laborAmount: String((Number(form.laborAmount) || 0) + labor),
      documentationAmount: String((Number(form.documentationAmount) || 0) + documentation),
      totalSpent: String((Number(form.totalSpent) || 0) + material + labor + documentation),
    });
    setDailyExpense({ materialAmount: "", laborAmount: "", documentationAmount: "" });
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight">Financeiro</h3>
          <p className="muted mt-1">Gastos, orcamento e distribuicao por etapa.</p>
        </div>
        <span className="badge-accent rounded-full px-3 py-1 text-sm font-black">Margem operacional</span>
      </div>
      {message && <p className="mb-4 rounded-2xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Total gasto" value={money(Number(form.totalSpent) || 0)} />
        <Stat title="Investido" value={money(Number(form.totalInvested) || 0)} />
        <Stat title="Valor cobrado" value={money(Number(form.chargedAmount) || 0)} />
      </div>
      {canManage && (
        <div className="mt-6 grid gap-4">
          <div className="surface-soft grid gap-3 rounded-3xl p-4 md:grid-cols-3">
            <Field label="Material do dia" type="number" value={dailyExpense.materialAmount} onChange={(value) => setDailyExpense({ ...dailyExpense, materialAmount: value })} />
            <Field label="Mao de obra do dia" type="number" value={dailyExpense.laborAmount} onChange={(value) => setDailyExpense({ ...dailyExpense, laborAmount: value })} />
            <Field label="Documentacao do dia" type="number" value={dailyExpense.documentationAmount} onChange={(value) => setDailyExpense({ ...dailyExpense, documentationAmount: value })} />
            <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold md:col-span-3" type="button" onClick={addDailyExpense}>
              <Plus size={18} />
              Calcular gastos diarios
            </button>
          </div>
          <form className="surface-soft grid gap-3 rounded-3xl p-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleFinanceSubmit}>
            <Field label="Total gasto" type="number" value={form.totalSpent} onChange={(value) => setForm({ ...form, totalSpent: value })} />
            <Field label="Investido" type="number" value={form.totalInvested} onChange={(value) => setForm({ ...form, totalInvested: value })} />
            <Field label="Valor cobrado" type="number" value={form.chargedAmount} onChange={(value) => setForm({ ...form, chargedAmount: value })} />
            <Field label="Materiais" type="number" value={form.materialAmount} onChange={(value) => setForm({ ...form, materialAmount: value })} />
            <Field label="Mao de obra" type="number" value={form.laborAmount} onChange={(value) => setForm({ ...form, laborAmount: value })} />
            <Field label="Documentacao" type="number" value={form.documentationAmount} onChange={(value) => setForm({ ...form, documentationAmount: value })} />
            <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold xl:col-span-3">
              <Save size={18} />
              Salvar financeiro
            </button>
          </form>
        </div>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <div className="surface-soft rounded-3xl p-5">
          <div className="grid min-h-64 items-end gap-4 sm:grid-cols-3">
            {[
              ["Gastos", Number(form.totalSpent) || 0],
              ["Investido", Number(form.totalInvested) || 0],
              ["Cobrado", Number(form.chargedAmount) || 0],
            ].map(([label, value]) => (
              <div className="flex h-full flex-col justify-end" key={label}>
                <div
                  className="rounded-t-3xl bg-gradient-to-t from-teal-500 to-violet-500"
                  style={{ height: `${(Number(value) / max) * 100}%`, minHeight: 34 }}
                />
                <p className="mt-3 text-sm font-black">{label}</p>
                <p className="muted text-sm">{money(Number(value))}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <TimelineItem title="Materiais" value={money(Number(form.materialAmount) || 0)} />
          <TimelineItem title="Mao de obra" value={money(Number(form.laborAmount) || 0)} />
          <TimelineItem title="Documentacao" value={money(Number(form.documentationAmount) || 0)} />
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="panel-flat rounded-2xl p-4">
      <p className="muted text-sm font-semibold">{title}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">{text}</p>;
}

class ModelViewerBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[28rem] w-full items-center justify-center p-5 text-center">
          <div className="surface-soft rounded-3xl p-5">
            <p className="font-black">Nao foi possivel abrir o modelo 3D.</p>
            <p className="muted mt-2 max-w-md text-sm leading-6">
              O arquivo pode depender de textura externa, estar corrompido ou usar uma versao de FBX nao suportada pelo navegador.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
