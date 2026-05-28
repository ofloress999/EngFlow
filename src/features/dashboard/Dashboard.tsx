import {
  Building2,
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  PackageMinus,
  Plus,
  Sun,
  UserCircle2,
  CalendarCheck,
} from "lucide-react";
import type { ThemeMode } from "../../App";
import { NotificationBar } from "../../components";
import { roleLabels } from "../../constants/labels";
import { canAccessView, isManagerRole } from "../../utils/permissions";
import { GlobalDashboard } from "./GlobalDashboard";
import { ProfileView } from "../profile/ProfileView";
import { NewProjectView } from "../projects/NewProjectView";
import { ProjectDetail, type ProjectTab } from "../projects/ProjectDetail";
import { ProjectsView } from "../projects/ProjectsView";
import { TicketsView } from "../tickets/TicketsView";
import { PricingView } from "../pricing/PricingView";
import { SheetsView } from "../sheets/SheetsView";
import { SuppliesView } from "../supplies/SuppliesView";
import { UpdatesView } from "../updates/UpdatesView";
import { InspectionsView } from "../inspections/InspectionsView";
import type { AppNotification, Project, User, View } from "../../types";

type DashboardProps = {
  user: User;
  view: View;
  projects: Project[];
  selectedProject?: Project;
  notifications: AppNotification[];
  statusMessage: string | null;
  isLoading: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAcceptInvitation: (notification: AppNotification) => void;
  onDeclineInvitation: (notification: AppNotification) => void;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkNotificationRead: (notification: AppNotification) => Promise<void>;
  onUserUpdate: (user: User) => void;
  onToast: (tone: "success" | "error" | "info", title: string, message?: string) => void;
  onLogout: () => void;
  onCreateProject: (payload: {
    name: string;
    address: string;
    photoUrl?: string;
    startDate?: string;
    expectedEndDate?: string;
  }) => Promise<void>;
  onRefreshProjects: () => Promise<void>;
  onRefreshNotifications: () => Promise<void>;
  onSelectView: (view: View) => void;
  onSelectProject: (id: string) => void;
};

type MenuItem = {
  id: View;
  label: string;
  icon: typeof Home;
};

export function Dashboard({
  user,
  view,
  projects,
  selectedProject,
  notifications,
  statusMessage,
  isLoading,
  theme,
  onToggleTheme,
  onAcceptInvitation,
  onDeclineInvitation,
  onOpenNotification,
  onMarkNotificationRead,
  onUserUpdate,
  onToast,
  onLogout,
  onCreateProject,
  onRefreshProjects,
  onRefreshNotifications,
  onSelectView,
  onSelectProject,
}: DashboardProps) {
  const canManage = isManagerRole(user.role);
  const isWorker = user.role === "pedreiro";
  const isClient = user.role === "cliente";
  const menu = buildMenu(user.role);
  const projectTabByView: Partial<Record<View, ProjectTab>> = {
    financeiro: "financeiro",
    projetos: "projetos",
  };
  const roleTone = user.role === "arquiteto" ? "Compatibilizacao e projetos" : roleLabels[user.role];

  function renderProjectDetail(initialTab?: ProjectTab) {
    if (!selectedProject) return <EmptyProjectState />;

    return (
      <ProjectDetail
        actorUserId={user.id}
        project={selectedProject}
        canManage={canManage}
        isWorker={isWorker}
        isClient={isClient}
        initialTab={initialTab}
        onRefreshProjects={onRefreshProjects}
        onRefreshNotifications={onRefreshNotifications}
        onBack={() => onSelectView("obras")}
      />
    );
  }

  return (
    <main className="min-h-screen">
      <aside className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[var(--sidebar)] px-4 py-3 text-white lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
              <Building2 size={23} />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">EngFlow</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">{roleTone}</p>
            </div>
          </div>
          <button className="icon-button border-white/10 bg-white/10 p-2 text-white lg:hidden" onClick={onLogout}>
            <LogOut size={17} />
          </button>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-soft lg:mt-9 lg:grid lg:overflow-visible lg:pb-0">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition lg:w-full ${
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onSelectView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 hidden lg:block">
          <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4">
            <p className="text-sm font-black">{user.name}</p>
            <p className="mt-1 truncate text-xs text-slate-300">{user.email}</p>
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:bg-white/10"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      <section className="min-w-0 pt-32 lg:pl-72 lg:pt-0">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="muted flex items-center gap-2 text-sm font-bold">
                <LayoutDashboard size={17} />
                Dashboard {roleLabels[user.role]}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Ola, {firstName(user.name)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBar
                notifications={notifications}
                onAcceptInvitation={onAcceptInvitation}
                onDeclineInvitation={onDeclineInvitation}
                onRefresh={onRefreshNotifications}
                onOpenNotification={onOpenNotification}
                onMarkRead={onMarkNotificationRead}
              />
              <button className="icon-button flex h-11 w-11 items-center justify-center" onClick={onToggleTheme}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="panel-flat hidden items-center gap-3 rounded-2xl px-3 py-2 text-left sm:flex"
                onClick={() => onSelectView("perfil")}
              >
                {user.avatarUrl ? (
                  <img className="h-8 w-8 rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
                ) : (
                  <UserCircle2 size={19} />
                )}
                <div>
                  <p className="text-sm font-black leading-none">{firstName(user.name)}</p>
                  <p className="muted mt-1 text-xs leading-none">{roleLabels[user.role]}</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8">
          {statusMessage && (
            <p className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-bold text-rose-500">
              {statusMessage}
            </p>
          )}

          <div className="fade-in">
            {view === "global" && (
              <GlobalDashboard
                projects={projects}
                notifications={notifications}
                onOpenProject={onSelectProject}
              />
            )}
            {view === "obras" && (
              <ProjectsView
                canManage={canManage}
                isClient={isClient}
                projects={projects}
                onCreate={() => onSelectView("nova-obra")}
                onOpen={onSelectProject}
              />
            )}
            {view === "nova-obra" && canManage && (
              <NewProjectView
                actorUserId={user.id}
                onBack={() => onSelectView("obras")}
                onCreateProject={onCreateProject}
              />
            )}
            {view === "perfil" && (
              <ProfileView user={user} onUserUpdate={onUserUpdate} onToast={onToast} />
            )}
            {view === "obra" && renderProjectDetail()}
            {(view === "financeiro" || view === "projetos") && renderProjectDetail(projectTabByView[view])}
            {view === "chamados" && (
              <TicketsView
                actorUserId={user.id}
                projectId={selectedProject?.id}
                projects={projects}
                canRespond={canManage}
                canCreate={isWorker || isClient}
                onRefreshNotifications={onRefreshNotifications}
              />
            )}
            {view === "precificacao" && canManage && (
              <PricingView actorUserId={user.id} projectId={selectedProject?.id} />
            )}
            {view === "planilhas" && canManage && (
              <SheetsView actorUserId={user.id} projectId={selectedProject?.id} />
            )}
            {view === "vistoria" && canManage && (
              <InspectionsView
                actorUserId={user.id}
                projects={projects}
                selectedProjectId={selectedProject?.id}
              />
            )}
            {view === "insumos" && (isWorker || user.role === "admin") && (
              <SuppliesView actorUserId={user.id} projectId={selectedProject?.id} />
            )}
            {view === "atualizacoes" && (
              <UpdatesView
                actorUserId={user.id}
                projectId={selectedProject?.id}
                canCreate={isWorker || canManage}
                isClient={isClient}
              />
            )}
          </div>

          {isLoading && (
            <div className="mt-5 grid gap-3">
              <div className="surface-soft h-3 w-48 animate-pulse rounded-full" />
              <div className="surface-soft h-3 w-72 animate-pulse rounded-full" />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function buildMenu(role: User["role"]): MenuItem[] {
  const base: MenuItem[] = [
    { id: "global", label: "Dashboard", icon: LayoutDashboard },
    { id: "perfil", label: "Perfil", icon: UserCircle2 },
  ];

  if (role === "pedreiro") {
    return withPermissions(role, [
      ...base,
      { id: "obras", label: "Obras", icon: Home },
      { id: "atualizacoes", label: "Atualizacoes", icon: ClipboardList },
      { id: "chamados", label: "Chamados", icon: MessageSquare },
      { id: "insumos", label: "Insumos", icon: PackageMinus },
    ]);
  }

  if (role === "cliente") {
    return withPermissions(role, [
      ...base,
      { id: "obras", label: "Minhas Obras", icon: Home },
      { id: "financeiro", label: "Financeiro", icon: Calculator },
      { id: "atualizacoes", label: "Atualizacoes", icon: ClipboardList },
      { id: "projetos", label: "Projetos", icon: FolderKanban },
      { id: "chamados", label: "Chamados", icon: MessageSquare },
    ]);
  }

  return withPermissions(role, [
    ...base,
    { id: "obras", label: "Gerenciar Obras", icon: Home },
    { id: "nova-obra", label: "Criar Obra", icon: Plus },
    { id: "chamados", label: "Chamados", icon: MessageSquare },
    { id: "precificacao", label: "Precificacao", icon: Calculator },
    { id: "planilhas", label: "Planilhas", icon: FileSpreadsheet },
    { id: "vistoria", label: "Vistoria", icon: CalendarCheck },
    { id: "insumos", label: "Insumos", icon: PackageMinus },
  ]);
}

function withPermissions(role: User["role"], menu: MenuItem[]) {
  return menu.filter((item) => canAccessView(role, item.id));
}

function firstName(name: string) {
  return name.trim().split(" ")[0] || "Usuario";
}

function EmptyProjectState() {
  return (
    <section className="panel rounded-3xl p-8">
      <h2 className="text-2xl font-black">Nenhuma obra selecionada</h2>
      <p className="muted mt-2">Crie uma obra ou aceite um convite para carregar os dados.</p>
    </section>
  );
}
