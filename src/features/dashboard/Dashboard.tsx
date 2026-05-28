import {
  Building2,
  Calculator,
  ClipboardList,
  Files,
  FileSpreadsheet,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PackageMinus,
  Plus,
  Sun,
  UserCircle2,
  CalendarCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { DocumentsView } from "../documents/DocumentsView";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canManage = isManagerRole(user.role);
  const isWorker = user.role === "pedreiro";
  const isClient = user.role === "cliente";
  const menu = buildMenu(user.role);
  const projectTabByView: Partial<Record<View, ProjectTab>> = {
    financeiro: "financeiro",
    projetos: "projetos",
    relatorio: "relatorio",
  };
  const roleTone = user.role === "arquiteto" ? "Compatibilizacao e projetos" : roleLabels[user.role];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);

  function handleMenuSelect(nextView: View) {
    setMobileMenuOpen(false);
    onSelectView(nextView);
  }

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
      <aside className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--sidebar)] px-4 py-3 text-white shadow-2xl shadow-black/10 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6 lg:shadow-none">
        <div className="flex items-center justify-between gap-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 sm:h-11 sm:w-11">
              <Building2 size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black tracking-tight sm:text-xl">EngFlow</p>
              <p className="max-w-[13rem] truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100 sm:max-w-none sm:text-xs sm:tracking-[0.2em]">
                {roleTone}
              </p>
            </div>
          </div>
          <button
            className="icon-button flex h-11 w-11 items-center justify-center border-white/10 bg-white/10 text-white lg:hidden"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <button
            className="fixed inset-0 top-[4.5rem] z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <nav
          className={`fixed left-3 right-3 top-[5rem] z-50 grid max-h-[calc(100dvh-6rem)] gap-2 overflow-y-auto rounded-3xl border border-white/10 bg-[var(--sidebar)] p-3 shadow-2xl shadow-black/30 transition duration-200 scrollbar-soft lg:static lg:mt-9 lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none ${
            mobileMenuOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0 lg:pointer-events-auto"
          }`}
        >
          {menu.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => handleMenuSelect(item.id)}
              >
                <Icon className="shrink-0" size={18} />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
          <div className="mt-2 rounded-3xl border border-white/10 bg-white/[0.08] p-4 lg:hidden">
            <p className="truncate text-sm font-black">{user.name}</p>
            <p className="mt-1 truncate text-xs text-slate-300">{user.email}</p>
          </div>
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:bg-white/10 lg:hidden"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Sair
          </button>
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

      <section className="min-w-0 pt-[4.5rem] lg:pl-72 lg:pt-0">
        <header className="sticky top-[4.5rem] z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4 lg:top-0">
          <div className="flex items-center justify-between gap-3 xl:items-center">
            <div className="min-w-0">
              <p className="muted flex items-center gap-2 text-sm font-bold">
                <LayoutDashboard className="shrink-0" size={17} />
                <span className="truncate">Dashboard {roleLabels[user.role]}</span>
              </p>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-3xl">
                Ola, {firstName(user.name)}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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

        <div className="px-4 py-5 sm:px-8 sm:py-6">
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
                canManage={canManage}
                onOpenProject={onSelectProject}
                onOpenDocuments={() => onSelectView("documentos")}
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
            {(view === "financeiro" || view === "projetos" || view === "relatorio") && renderProjectDetail(projectTabByView[view])}
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
            {view === "documentos" && canManage && (
              <DocumentsView
                actorUserId={user.id}
                projects={projects}
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
  const managerBase: MenuItem[] = isManagerRole(role)
    ? [...base, { id: "documentos", label: "Documentos", icon: Files }]
    : base;

  if (role === "pedreiro") {
    return withPermissions(role, [
      ...base,
      { id: "obras", label: "Obras", icon: Home },
      { id: "atualizacoes", label: "Atualizacoes", icon: ClipboardList },
      { id: "relatorio", label: "Relatorio IA", icon: Files },
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
      { id: "relatorio", label: "Relatorio IA", icon: Files },
      { id: "projetos", label: "Projetos", icon: FolderKanban },
      { id: "chamados", label: "Chamados", icon: MessageSquare },
    ]);
  }

  return withPermissions(role, [
    ...managerBase,
    { id: "obras", label: "Gerenciar Obras", icon: Home },
    { id: "nova-obra", label: "Criar Obra", icon: Plus },
    { id: "relatorio", label: "Relatorio IA", icon: Files },
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
