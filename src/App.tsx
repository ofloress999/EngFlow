import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { engflowApi, getApiErrorMessage } from "./api/engflowApi";
import { CriticalErrorModal, ToastHost } from "./components";
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

export default function App() {
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
  const [view, setView] = useState<View>("global");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setTheme] = useState<ThemeMode>("light");

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
    setNotifications(await engflowApi.listNotifications(userId));
  }

  async function refreshUserData(userId: string) {
    await Promise.all([loadProjects(userId), loadNotifications(userId)]);
  }

  useEffect(() => {
    if (!currentUser) return;
    refreshUserData(currentUser.id).catch((apiError) => {
      setCriticalError(getApiErrorMessage(apiError, "Nao foi possivel carregar seus dados."));
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = window.setInterval(() => {
      loadNotifications(currentUser.id).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [currentUser?.id]);

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
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );
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

  return (
    <div className={`app-root ${theme === "dark" ? "theme-dark" : ""}`}>
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <CriticalErrorModal
        message={criticalError}
        onClose={() => setCriticalError(null)}
        onRetry={() => refreshUserData(currentUser.id)}
      />
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
