import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { engflowApi, getApiErrorMessage, isNetworkError } from "./api/engflowApi";
import { ToastHost } from "./components";
import type { ToastMessage, ToastTone } from "./components";
import { AuthScreen } from "./features/auth/AuthScreen";
import { Dashboard } from "./features/dashboard/Dashboard";
import type { AppNotification, AuthMode, Project, Role, User, View } from "./types";
import { canAccessView } from "./utils/permissions";
import { cleanCpf, isValidCpf, passwordIssues } from "./utils/format";

export type RegisterForm = {
  name: string;
  email: string;
  cpf: string;
  password: string;
  role: Role;
};

export type ThemeMode = "light" | "dark";

const defaultRoute: AppRoute = { view: "global", projectId: null };
const THEME_KEY = "engflow.theme";

type AppRoute = {
  view: View;
  projectId: string | null;
};

export default function App() {
  const initialRoute = readRoute();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(() => engflowApi.getStoredUser());
  const [loginCpf, setLoginCpf] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [register, setRegister] = useState<RegisterForm>({
    name: "",
    email: "",
    cpf: "",
    password: "",
    role: "engenheiro",
  });
  const [view, setView] = useState<View>(initialRoute.view);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialRoute.projectId);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOffline, setServerOffline] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());

  const selectedProject = useMemo(
    () =>
      selectedProjectId
        ? projects.find((project) => project.id === selectedProjectId)
        : projects[0],
    [projects, selectedProjectId],
  );

  async function loadProjects(userId: string) {
    const loadedProjects = await engflowApi.listProjects(userId);
    setProjects(loadedProjects);
    setSelectedProjectId((current) => {
      if (current && loadedProjects.some((project) => project.id === current)) {
        return current;
      }

      return loadedProjects[0]?.id ?? null;
    });
  }

  async function loadNotifications(userId: string) {
    const loaded = await engflowApi.listNotifications(userId);
    setNotifications(loaded.filter((notification) => !notification.read));
  }

  async function refreshUserData(userId: string) {
    await Promise.all([loadProjects(userId), loadNotifications(userId)]);
  }

  useEffect(() => {
    if (!currentUser) return;
    refreshUserData(currentUser.id).catch((apiError) => {
      if (isNetworkError(apiError)) {
        setServerOffline(true);
        return;
      }
      setError(getApiErrorMessage(apiError, "Nao foi possivel carregar seus dados."));
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const onPopState = () => {
      const route = readRoute();
      setView(route.view);
      setSelectedProjectId(route.projectId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    writeRoute({ view, projectId: selectedProjectId }, true);
  }, [currentUser?.id, view, selectedProjectId]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = window.setInterval(() => {
      loadNotifications(currentUser.id).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const onServerOffline = () => setServerOffline(true);
    window.addEventListener("engflow:server-offline", onServerOffline);
    return () => window.removeEventListener("engflow:server-offline", onServerOffline);
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function pushToast(tone: ToastTone, title: string, message?: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5200);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (!isValidCpf(loginCpf)) {
        throw new Error("CPF invalido");
      }
      const user = await engflowApi.login(cleanCpf(loginCpf), loginPassword);
      setCurrentUser(user);
      await refreshUserData(user.id);
      setView("global");
      setServerOffline(false);
      pushToast("success", "Login realizado", "Bem-vindo ao EngFlow.");
    } catch (apiError) {
      setError(apiError instanceof Error && apiError.message === "CPF invalido"
        ? "CPF invalido."
        : getApiErrorMessage(apiError, "Nao foi possivel realizar login."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (!isValidCpf(register.cpf)) {
        throw new Error("CPF invalido");
      }
      const issues = passwordIssues(register.password);
      if (issues.length > 0) {
        throw new Error(`Senha fraca: ${issues.join(", ")}.`);
      }
      const user = await engflowApi.register({
        ...register,
        cpf: cleanCpf(register.cpf),
      });
      setCurrentUser(user);
      await refreshUserData(user.id);
      setView("global");
      setServerOffline(false);
      pushToast("success", "Cadastro criado", "Sua conta esta pronta.");
    } catch (apiError) {
      setError(apiError instanceof Error && apiError.message === "CPF invalido"
        ? "CPF invalido."
        : apiError instanceof Error && apiError.message.startsWith("Senha fraca")
          ? apiError.message
          : getApiErrorMessage(apiError, "Nao foi possivel criar cadastro."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProject(payload: {
    name: string;
    address: string;
    photoUrl?: string;
    startDate?: string;
    expectedEndDate?: string;
  }) {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const project = await engflowApi.createProject({
        ownerUserId: currentUser.id,
        ...payload,
      });
      await refreshUserData(currentUser.id);
      setSelectedProjectId(project.id);
      setView("obra");
      pushToast("success", "Obra criada", "A nova obra ja esta disponivel.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Nao foi possivel criar a obra."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompleteProject(project: Project) {
    if (!currentUser) return;
    const confirmed = window.confirm(`Concluir a obra "${project.name}" e mover para Arquivadas?`);
    if (!confirmed) return;
    setIsLoading(true);
    setError(null);
    try {
      await engflowApi.completeProject(project.id, currentUser.id);
      await refreshUserData(currentUser.id);
      setView("arquivadas");
      pushToast("success", "Obra concluida", "A obra foi movida para Arquivadas.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Nao foi possivel concluir a obra."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!currentUser) return;
    const confirmed = window.confirm(`Excluir definitivamente a obra "${project.name}"? Esta acao remove historico, documentos e chamados vinculados.`);
    if (!confirmed) return;
    setIsLoading(true);
    setError(null);
    try {
      await engflowApi.deleteProject(project.id, currentUser.id);
      await refreshUserData(currentUser.id);
      setSelectedProjectId((current) => (current === project.id ? null : current));
      pushToast("success", "Obra excluida", "A obra foi removida do EngFlow.");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Nao foi possivel excluir a obra."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAcceptInvitation(notification: AppNotification) {
    if (!currentUser || !notification.invitationId) return;
    setIsLoading(true);
    setError(null);
    try {
      await engflowApi.acceptInvitation(notification.invitationId, currentUser.id);
      await refreshUserData(currentUser.id);
      if (notification.projectId) {
        setSelectedProjectId(notification.projectId);
        setView("obra");
      }
      await handleMarkNotificationRead(notification);
      pushToast("success", "Convite aceito");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Nao foi possivel aceitar o convite."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeclineInvitation(notification: AppNotification) {
    if (!currentUser || !notification.invitationId) return;
    setIsLoading(true);
    setError(null);
    try {
      await engflowApi.declineInvitation(notification.invitationId, currentUser.id);
      await handleMarkNotificationRead(notification);
      await loadNotifications(currentUser.id);
      pushToast("info", "Convite recusado");
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Nao foi possivel recusar o convite."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenNotification(notification: AppNotification) {
    if (!notification.projectId) return;

    setSelectedProjectId(notification.projectId);
    setView(
      notification.type === "TICKET_RECEIVED" || notification.type === "TICKET_ANSWERED"
        ? "chamados"
        : "obra",
    );
  }

  async function handleMarkNotificationRead(notification: AppNotification) {
    if (!currentUser || notification.read) return;
    await engflowApi.markNotificationRead(notification.id, currentUser.id);
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
  }

  async function handleClearNotifications() {
    if (!currentUser) return;
    const currentNotifications = [...notifications];
    setNotifications([]);
    await Promise.all(currentNotifications.map((notification) =>
      engflowApi.markNotificationRead(notification.id, currentUser.id).catch(() => undefined),
    ));
  }

  function handleSelectView(nextView: View) {
    if (!currentUser || canAccessView(currentUser.role, nextView)) {
      setView(nextView);
      return;
    }
    pushToast("error", "Acesso restrito", "Seu perfil nao possui permissao para esta area.");
  }

  async function handleLogout() {
    await engflowApi.logout();
    setCurrentUser(null);
    setProjects([]);
    setSelectedProjectId(null);
    setNotifications([]);
    setView("global");
    window.history.replaceState(null, "", "/");
  }

  function handleRetryServer() {
    window.location.reload();
  }

  if (!currentUser) {
    return (
      <div className={`app-root ${theme === "dark" ? "theme-dark" : ""}`}>
        <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
        <AuthScreen
          authMode={authMode}
          loginCpf={loginCpf}
          loginPassword={loginPassword}
          register={register}
          isLoading={isLoading}
          error={error}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          setAuthMode={setAuthMode}
          setLoginCpf={setLoginCpf}
          setLoginPassword={setLoginPassword}
          setRegister={setRegister}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </div>
    );
  }

  if (serverOffline) {
    return (
      <div className={`app-root ${theme === "dark" ? "theme-dark" : ""}`}>
        <ServerOfflineView onRetry={handleRetryServer} onLogout={() => void handleLogout()} />
      </div>
    );
  }

  return (
    <div className={`app-root ${theme === "dark" ? "theme-dark" : ""}`}>
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <Dashboard
        user={currentUser}
        view={view}
        projects={projects}
        selectedProject={selectedProject}
        notifications={notifications}
        statusMessage={error}
        isLoading={isLoading}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onAcceptInvitation={handleAcceptInvitation}
        onDeclineInvitation={handleDeclineInvitation}
        onOpenNotification={handleOpenNotification}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearNotifications={handleClearNotifications}
        onUserUpdate={setCurrentUser}
        onToast={pushToast}
        onLogout={handleLogout}
        onCreateProject={handleCreateProject}
        onCompleteProject={handleCompleteProject}
        onDeleteProject={handleDeleteProject}
        onRefreshProjects={() => refreshUserData(currentUser.id)}
        onRefreshNotifications={() => loadNotifications(currentUser.id)}
        onSelectView={handleSelectView}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setView("obra");
        }}
      />
    </div>
  );
}

function readRoute(): AppRoute {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "dashboard") return defaultRoute;
  if (parts[0] === "obras") return { view: "obras", projectId: null };
  if (parts[0] === "criar-obra") return { view: "nova-obra", projectId: null };
  if (parts[0] === "obra" && parts[1]) {
    const view = tabPathToView(parts[2]);
    return { view, projectId: decodeURIComponent(parts[1]) };
  }
  const view = pathToView[parts[0]];
  return view ? { view, projectId: null } : defaultRoute;
}

function writeRoute(route: AppRoute, replace = false) {
  const path = routeToPath(route);
  if (window.location.pathname === path) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", path);
}

function routeToPath(route: AppRoute) {
  if (route.projectId && ["obra", "financeiro", "projetos", "relatorio"].includes(route.view)) {
    const suffix = route.view === "obra" ? "" : `/${viewToTabPath[route.view] ?? route.view}`;
    return `/obra/${encodeURIComponent(route.projectId)}${suffix}`;
  }
  return viewToPath[route.view] ?? "/dashboard";
}

const pathToView: Record<string, View> = {
  dashboard: "global",
  perfil: "perfil",
  chamados: "chamados",
  relatorio: "relatorio",
  financeiro: "financeiro",
  projetos: "projetos",
  documentacao: "documentacao",
  arquivadas: "arquivadas",
  precificacao: "precificacao",
  planilhas: "planilhas",
  vistoria: "vistoria",
  insumos: "insumos",
  atualizacoes: "atualizacoes",
};

const viewToPath: Record<View, string> = {
  global: "/dashboard",
  obras: "/obras",
  "nova-obra": "/criar-obra",
  obra: "/obra",
  perfil: "/perfil",
  chamados: "/chamados",
  relatorio: "/relatorio",
  financeiro: "/financeiro",
  projetos: "/projetos",
  documentacao: "/documentacao",
  arquivadas: "/arquivadas",
  precificacao: "/precificacao",
  planilhas: "/planilhas",
  vistoria: "/vistoria",
  insumos: "/insumos",
  atualizacoes: "/atualizacoes",
};

const viewToTabPath: Partial<Record<View, string>> = {
  financeiro: "financeiro",
  projetos: "projetos",
  relatorio: "relatorio-ia",
};

function tabPathToView(tab?: string): View {
  if (tab === "financeiro") return "financeiro";
  if (tab === "projetos") return "projetos";
  if (tab === "relatorio-ia" || tab === "relatorio") return "relatorio";
  return "obra";
}

function ServerOfflineView({ onRetry, onLogout }: { onRetry: () => void; onLogout: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <section className="panel max-w-xl rounded-[2rem] p-6 text-center">
        <p className="badge-accent mx-auto mb-4 w-fit rounded-full px-3 py-1 text-xs font-black uppercase">Conexao instavel</p>
        <h1 className="text-3xl font-black tracking-tight">Nao foi possivel atualizar seus dados agora</h1>
        <p className="muted mt-3 leading-7">
          Suas informacoes estao preservadas. Aguarde alguns instantes e tente carregar a area novamente.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="btn-primary px-4 py-3 font-bold" type="button" onClick={onRetry}>
            Carregar novamente
          </button>
          <button className="btn-secondary px-4 py-3 font-bold" type="button" onClick={onLogout}>
            Sair da conta
          </button>
        </div>
      </section>
    </main>
  );
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
