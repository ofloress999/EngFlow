import axios from "axios";
import type {
  ApiRole,
  AppNotification,
  ChatMessage,
  ChecklistItem,
  DailyLog,
  EvolutionComparison,
  Inspection,
  PricingEstimate,
  Project,
  ProjectFile,
  ProjectMember,
  Role,
  SheetEntry,
  SupplyRequest,
  Ticket,
  TicketMessage,
  User,
  WorkUpdate,
  WorkUpdateComment,
  WorkUpdateType,
} from "../types";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

const authHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

const SESSION_KEY = "engflow.session";

type SessionState = {
  user: User;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
};

type ApiErrorBody = {
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback = "Nao foi possivel concluir a acao.") {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return "Verifique sua conexao.";
    }
    return error.response.data?.message ?? messageForStatus(error.response.status, fallback);
  }

  return fallback;
}

function messageForStatus(status: number, fallback: string) {
  if (status === 400) return "Verifique os campos informados.";
  if (status === 401) return "Email, CPF ou senha invalidos.";
  if (status === 403) return "Voce nao tem permissao para executar esta acao.";
  if (status === 404) return "Registro nao encontrado.";
  if (status === 409) return "Ja existe um registro com esses dados.";
  if (status === 429) return "Muitas tentativas. Aguarde alguns instantes.";
  if (status >= 500) return "Servidor temporariamente indisponivel.";
  return fallback;
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

function saveSession(response: ApiAuthResponse) {
  const session: SessionState = {
    user: toUser(response.user),
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session.user;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  phone?: string;
  avatarUrl?: string;
  role: ApiRole;
};

type ApiAuthResponse = {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
};

type ApiProject = {
  id: string;
  name: string;
  address: string;
  photoUrl?: string;
  status: "EM_PLANEJAMENTO" | "EM_ANDAMENTO" | "PAUSADA" | "CONCLUIDA";
  progressPercent: number;
  totalSpent: number;
  totalInvested: number;
  chargedAmount: number;
  materialAmount?: number;
  laborAmount?: number;
  documentationAmount?: number;
  startDate: string | null;
  expectedEndDate: string | null;
  ownerUserId: string;
};

const roleToApi: Record<Role, ApiRole> = {
  admin: "ADMIN",
  engenheiro: "ENGENHEIRO",
  arquiteto: "ARQUITETO",
  pedreiro: "PEDREIRO",
  cliente: "CLIENTE",
};

const roleFromApi: Record<ApiRole, Role> = {
  ADMIN: "admin",
  ENGENHEIRO: "engenheiro",
  ARQUITETO: "arquiteto",
  PEDREIRO: "pedreiro",
  CLIENTE: "cliente",
};

const statusFromApi: Record<ApiProject["status"], Project["status"]> = {
  EM_PLANEJAMENTO: "Em planejamento",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluida",
};

const statusToApi: Record<Project["status"], ApiProject["status"]> = {
  "Em planejamento": "EM_PLANEJAMENTO",
  "Em andamento": "EM_ANDAMENTO",
  Pausada: "PAUSADA",
  Concluida: "CONCLUIDA",
};

function toUser(user: ApiUser): User {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    cpf: user.cpf,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: roleFromApi[user.role],
  };
}

function toProject(project: ApiProject): Project {
  return {
    id: project.id,
    name: project.name,
    address: project.address,
    photoUrl: project.photoUrl,
    status: statusFromApi[project.status],
    progress: project.progressPercent,
    spent: Number(project.totalSpent ?? 0),
    invested: Number(project.totalInvested ?? 0),
    charged: Number(project.chargedAmount ?? 0),
    materials: Number(project.materialAmount ?? 0),
    labor: Number(project.laborAmount ?? 0),
    documentation: Number(project.documentationAmount ?? 0),
    start: project.startDate,
    deadline: project.expectedEndDate ?? "Sem prazo",
    client: null,
    ownerUserId: project.ownerUserId,
  };
}

let refreshPromise: Promise<string | null> | null = null;

http.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.accessToken && !config.url?.startsWith("/auth/")) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  config.headers["X-Requested-With"] = "XMLHttpRequest";
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const session = readSession();
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (axios.isAxiosError(error) && error.response?.status === 401 && session?.refreshToken && !original?._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken(session.refreshToken).finally(() => {
        refreshPromise = null;
      });
      const accessToken = await refreshPromise;
      if (accessToken) {
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(refreshToken: string) {
  try {
    const { data } = await authHttp.post<ApiAuthResponse>("/auth/refresh", { refreshToken });
    saveSession(data);
    return data.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

export const engflowApi = {
  getStoredUser() {
    return readSession()?.user ?? null;
  },

  async login(cpf: string, password: string) {
    const { data } = await authHttp.post<ApiAuthResponse>("/auth/login", { cpf, password });
    return saveSession(data);
  },

  async register(payload: Omit<User, "id"> & { password: string }) {
    const { data } = await authHttp.post<ApiAuthResponse>("/auth/register", {
      fullName: payload.name,
      email: payload.email,
      cpf: payload.cpf,
      password: payload.password,
      role: roleToApi[payload.role],
    });
    return saveSession(data);
  },

  async logout() {
    const session = readSession();
    clearSession();
    if (session?.refreshToken) {
      await authHttp.post("/auth/logout", { refreshToken: session.refreshToken }).catch(() => undefined);
    }
  },

  async findUserByCpf(cpf: string) {
    const { data } = await http.get<ApiUser>(`/users/cpf/${cpf}`);
    return toUser(data);
  },

  async listProjects(actorUserId: string) {
    const { data } = await http.get<ApiProject[]>("/projects", {
      params: { actorUserId },
    });
    return data.map(toProject);
  },

  async createProject(payload: {
    ownerUserId: string;
    name: string;
    address: string;
    photoUrl?: string;
    startDate?: string;
    expectedEndDate?: string;
  }) {
    const { data } = await http.post<ApiProject>("/projects", payload);
    return toProject(data);
  },

  async updateProject(projectId: string, payload: {
    actorUserId: string;
    name: string;
    address: string;
    photoUrl?: string;
    status: Project["status"];
    progressPercent: number;
    startDate?: string;
    expectedEndDate?: string;
  }) {
    const { data } = await http.patch<ApiProject>(`/projects/${projectId}`, {
      ...payload,
      status: statusToApi[payload.status],
    });
    return toProject(data);
  },

  async completeProject(projectId: string, actorUserId: string) {
    const { data } = await http.patch<ApiProject>(`/projects/${projectId}/complete`, { actorUserId });
    return toProject(data);
  },

  async deleteProject(projectId: string, actorUserId: string) {
    await http.delete(`/projects/${projectId}`, {
      data: { actorUserId },
    });
  },

  async updateProjectFinance(projectId: string, payload: {
    actorUserId: string;
    totalSpent: number;
    totalInvested: number;
    chargedAmount: number;
    materialAmount: number;
    laborAmount: number;
    documentationAmount: number;
  }) {
    const { data } = await http.patch<ApiProject>(`/projects/${projectId}/finance`, payload);
    return toProject(data);
  },

  async inviteMember(projectId: string, payload: { actorUserId: string; cpf: string; role: Role }) {
    const { data } = await http.post(`/projects/${projectId}/members/invite`, {
      actorUserId: payload.actorUserId,
      cpf: payload.cpf,
      role: roleToApi[payload.role],
    });
    return data as { id: string; inviteLink: string; status: string };
  },

  async listMembers(projectId: string, actorUserId: string) {
    const { data } = await http.get<ProjectMember[]>(`/projects/${projectId}/members`, {
      params: { actorUserId },
    });
    return data;
  },

  async listFiles(projectId: string, actorUserId: string) {
    const { data } = await http.get<ProjectFile[]>(`/projects/${projectId}/files`, {
      params: { actorUserId },
    });
    return data;
  },

  async addFile(projectId: string, payload: {
    actorUserId: string;
    category: string;
    name: string;
    fileUrl: string;
    contentType?: string;
    tags?: string;
    labelColor?: string;
    folderPath?: string;
  }) {
    const { data } = await http.post<ProjectFile>(`/projects/${projectId}/files`, payload);
    return data;
  },

  async listUpdates(projectId: string, actorUserId: string) {
    const { data } = await http.get<WorkUpdate[]>(`/projects/${projectId}/updates`, {
      params: { actorUserId },
    });
    return data;
  },

  async addUpdate(projectId: string, payload: {
    actorUserId: string;
    title: string;
    description: string;
    type?: WorkUpdateType;
    photoUrl?: string;
    mediaUrl?: string;
    mediaContentType?: string;
    progressPercent?: number;
  }) {
    const { data } = await http.post<WorkUpdate>(`/projects/${projectId}/updates`, payload);
    return data;
  },

  async likeUpdate(updateId: string, actorUserId: string) {
    const { data } = await http.post<WorkUpdate>(`/updates/${updateId}/likes`, { actorUserId });
    return data;
  },

  async pinUpdate(updateId: string, actorUserId: string, pinned: boolean) {
    const { data } = await http.patch<WorkUpdate>(`/updates/${updateId}/pin`, { actorUserId, pinned });
    return data;
  },

  async listUpdateComments(updateId: string, actorUserId: string) {
    const { data } = await http.get<WorkUpdateComment[]>(`/updates/${updateId}/comments`, {
      params: { actorUserId },
    });
    return data;
  },

  async addUpdateComment(updateId: string, payload: { actorUserId: string; message: string }) {
    const { data } = await http.post<WorkUpdateComment>(`/updates/${updateId}/comments`, payload);
    return data;
  },

  async listDailyLogs(projectId: string, actorUserId: string, range?: { start?: string; end?: string }) {
    const { data } = await http.get<DailyLog[]>(`/projects/${projectId}/daily-logs`, {
      params: { actorUserId, start: range?.start, end: range?.end },
    });
    return data;
  },

  async createDailyLog(projectId: string, payload: {
    actorUserId: string;
    logDate: string;
    weather?: string;
    temperature?: string;
    workerCount: number;
    servicesExecuted: string;
    problemsFound?: string;
    materialsUsed?: string;
    photoUrl?: string;
    videoUrl?: string;
    observations?: string;
  }) {
    const { data } = await http.post<DailyLog>(`/projects/${projectId}/daily-logs`, payload);
    return data;
  },

  async listChatMessages(projectId: string, actorUserId: string, channel: string) {
    const { data } = await http.get<ChatMessage[]>(`/projects/${projectId}/chat/messages`, {
      params: { actorUserId, channel },
    });
    return data;
  },

  async sendChatMessage(projectId: string, payload: {
    actorUserId: string;
    channel?: string;
    recipientUserId?: string;
    message: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attachmentName?: string;
    replyToId?: string;
  }) {
    const { data } = await http.post<ChatMessage>(`/projects/${projectId}/chat/messages`, payload);
    return data;
  },

  async listChecklist(projectId: string, actorUserId: string) {
    const { data } = await http.get<ChecklistItem[]>(`/projects/${projectId}/checklist`, {
      params: { actorUserId },
    });
    return data;
  },

  async saveChecklistItem(projectId: string, itemId: string | undefined, payload: {
    actorUserId: string;
    stage: string;
    title: string;
    approved: boolean;
    photoUrl?: string;
    comment?: string;
    signature?: string;
  }) {
    const request = itemId
      ? http.put<ChecklistItem>(`/projects/${projectId}/checklist/${itemId}`, payload)
      : http.post<ChecklistItem>(`/projects/${projectId}/checklist`, payload);
    const { data } = await request;
    return data;
  },

  async deleteChecklistItem(projectId: string, itemId: string, actorUserId: string) {
    await http.delete(`/projects/${projectId}/checklist/${itemId}`, {
      data: { actorUserId },
    });
  },

  async listEvolutionComparisons(projectId: string, actorUserId: string) {
    const { data } = await http.get<EvolutionComparison[]>(`/projects/${projectId}/evolution-comparisons`, {
      params: { actorUserId },
    });
    return data;
  },

  async saveEvolutionComparison(projectId: string, payload: {
    actorUserId: string;
    beforeUrl: string;
    afterUrl: string;
    title?: string;
  }) {
    const { data } = await http.post<EvolutionComparison>(`/projects/${projectId}/evolution-comparisons`, payload);
    return data;
  },

  async listTickets(projectId: string, actorUserId: string) {
    const { data } = await http.get<Ticket[]>(`/projects/${projectId}/tickets`, {
      params: { actorUserId },
    });
    return data;
  },

  async openTicket(projectId: string, payload: {
    actorUserId: string;
    assignedToUserId: string;
    priority?: Ticket["priority"];
    subject: string;
    description: string;
    mediaUrl?: string;
    mediaContentType?: string;
  }) {
    const { data } = await http.post<Ticket>(`/projects/${projectId}/tickets`, payload);
    return data;
  },

  async answerTicket(ticketId: string, payload: {
    actorUserId: string;
    message: string;
    attachmentUrl?: string;
    attachmentType?: string;
  }) {
    const { data } = await http.post<TicketMessage>(`/tickets/${ticketId}/messages`, payload);
    return data;
  },

  async listTicketMessages(ticketId: string, actorUserId: string) {
    const { data } = await http.get<TicketMessage[]>(`/tickets/${ticketId}/messages`, {
      params: { actorUserId },
    });
    return data;
  },

  async updateTicketStatus(ticketId: string, payload: {
    actorUserId: string;
    status: "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "CANCELADO";
  }) {
    const { data } = await http.patch<Ticket>(`/tickets/${ticketId}/status`, payload);
    return data;
  },

  async listSupplies(projectId: string, actorUserId: string) {
    const { data } = await http.get<SupplyRequest[]>(`/projects/${projectId}/supplies`, {
      params: { actorUserId },
    });
    return data;
  },

  async requestSupply(projectId: string, payload: {
    actorUserId: string;
    itemName: string;
    quantity: string;
    observation?: string;
  }) {
    const { data } = await http.post<SupplyRequest>(`/projects/${projectId}/supplies`, payload);
    return data;
  },

  async approveSupply(supplyId: string, actorUserId: string) {
    const { data } = await http.post<SupplyRequest>(`/supplies/${supplyId}/approve`, null, {
      params: { actorUserId },
    });
    return data;
  },

  async listPricing(projectId: string, actorUserId: string) {
    const { data } = await http.get<PricingEstimate[]>(`/projects/${projectId}/pricing`, {
      params: { actorUserId },
    });
    return data;
  },

  async createPricing(projectId: string, payload: {
    actorUserId: string;
    areaM2: number;
    pricePerM2: number;
    complexityPercent: number;
    marginPercent: number;
  }) {
    const { data } = await http.post<PricingEstimate>(`/projects/${projectId}/pricing`, payload);
    return data;
  },

  async updatePricing(projectId: string, pricingId: string, payload: {
    actorUserId: string;
    areaM2: number;
    pricePerM2: number;
    complexityPercent: number;
    marginPercent: number;
  }) {
    const { data } = await http.put<PricingEstimate>(`/projects/${projectId}/pricing/${pricingId}`, payload);
    return data;
  },

  async deletePricing(projectId: string, pricingId: string, actorUserId: string) {
    await http.delete(`/projects/${projectId}/pricing/${pricingId}`, {
      data: { actorUserId },
    });
  },

  async listSheetEntries(projectId: string, actorUserId: string) {
    const { data } = await http.get<SheetEntry[]>(`/projects/${projectId}/sheet-entries`, {
      params: { actorUserId },
    });
    return data;
  },

  async addSheetEntry(projectId: string, payload: {
    actorUserId: string;
    item: string;
    category: string;
    amount: number;
    formula?: string;
    status: string;
  }) {
    const { data } = await http.post<SheetEntry>(`/projects/${projectId}/sheet-entries`, payload);
    return data;
  },

  async updateSheetEntry(projectId: string, entryId: string, payload: {
    actorUserId: string;
    item: string;
    category: string;
    amount: number;
    formula?: string;
    status: string;
  }) {
    const { data } = await http.put<SheetEntry>(`/projects/${projectId}/sheet-entries/${entryId}`, payload);
    return data;
  },

  async deleteSheetEntry(projectId: string, entryId: string, actorUserId: string) {
    await http.delete(`/projects/${projectId}/sheet-entries/${entryId}`, {
      data: { actorUserId },
    });
  },

  async listInspections(projectId: string, actorUserId: string) {
    const { data } = await http.get<Inspection[]>(`/projects/${projectId}/inspections`, {
      params: { actorUserId },
    });
    return data;
  },

  async createInspection(projectId: string, payload: {
    actorUserId: string;
    title: string;
    scheduledFor: string;
    location?: string;
    notes?: string;
    attachmentName?: string;
    attachmentUrl?: string;
    contentType?: string;
  }) {
    const { data } = await http.post<Inspection>(`/projects/${projectId}/inspections`, payload);
    return data;
  },

  async updateInspection(projectId: string, inspectionId: string, payload: {
    actorUserId: string;
    title: string;
    scheduledFor: string;
    location?: string;
    notes?: string;
    attachmentName?: string;
    attachmentUrl?: string;
    contentType?: string;
  }) {
    const { data } = await http.put<Inspection>(`/projects/${projectId}/inspections/${inspectionId}`, payload);
    return data;
  },

  async deleteInspection(projectId: string, inspectionId: string, actorUserId: string) {
    await http.delete(`/projects/${projectId}/inspections/${inspectionId}`, {
      data: { actorUserId },
    });
  },

  async listNotifications(actorUserId: string) {
    const { data } = await http.get<AppNotification[]>("/notifications", {
      params: { actorUserId },
    });
    return data;
  },

  async markNotificationRead(notificationId: string, actorUserId: string) {
    await http.patch(`/notifications/${encodeURIComponent(notificationId)}/read`, null, {
      params: { actorUserId },
    });
  },

  async updateProfile(userId: string, payload: {
    fullName: string;
    email: string;
    phone?: string;
    avatarDataUrl?: string;
  }) {
    const { data } = await http.patch<ApiUser>(`/users/${userId}/profile`, payload);
    const session = readSession();
    const user = toUser(data);
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user }));
    }
    return user;
  },

  async changePassword(userId: string, payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    await http.patch(`/users/${userId}/password`, payload);
  },

  async acceptInvitation(invitationId: string, actorUserId: string) {
    const { data } = await http.post(`/invitations/${invitationId}/accept`, null, {
      params: { actorUserId },
    });
    return data;
  },

  async declineInvitation(invitationId: string, actorUserId: string) {
    const { data } = await http.post(`/invitations/${invitationId}/decline`, null, {
      params: { actorUserId },
    });
    return data;
  },

  async askEngineeringAssistant(payload: {
    prompt: string;
    provider: "openai" | "gemini";
    projectName: string;
    projectStatus: string;
    projectProgress: number;
    fileCount: number;
  }) {
    const { data } = await http.post<{
      provider: string;
      model: string;
      answer: string;
      fallback: boolean;
    }>("/ai/engineering-assistant", payload);
    return data;
  },
};
