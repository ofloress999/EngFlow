import type { FormEvent } from "react";

export type Role = "admin" | "engenheiro" | "arquiteto" | "pedreiro" | "cliente";
export type ApiRole = "ADMIN" | "ENGENHEIRO" | "ARQUITETO" | "PEDREIRO" | "CLIENTE";
export type ProjectStatus = "Em andamento" | "Concluida" | "Pausada" | "Em planejamento";
export type AuthMode = "login" | "register";

export type View =
  | "global"
  | "obras"
  | "nova-obra"
  | "obra"
  | "perfil"
  | "chamados"
  | "relatorio"
  | "financeiro"
  | "projetos"
  | "documentacao"
  | "arquivadas"
  | "precificacao"
  | "planilhas"
  | "vistoria"
  | "insumos"
  | "atualizacoes";

export type User = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
};

export type Project = {
  id: string;
  name: string;
  address: string;
  photoUrl?: string;
  status: ProjectStatus;
  progress: number;
  spent: number;
  charged: number;
  invested: number;
  materials: number;
  labor: number;
  documentation: number;
  start: string | null;
  deadline: string;
  client: string | null;
  ownerUserId: string;
};

export type AuthSubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

export type ProjectFile = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  contentType?: string;
  tags?: string;
  folderPath?: string;
};

export type WorkUpdate = {
  id: string;
  title: string;
  description: string;
  type?: WorkUpdateType;
  photoUrl?: string;
  mediaUrl?: string;
  mediaContentType?: string;
  pinned?: boolean;
  likesCount?: number;
  commentsCount?: number;
  progressPercent?: number;
  createdAt?: string;
  createdBy?: User;
};

export type WorkUpdateType =
  | "OBRA"
  | "FOTO"
  | "VIDEO"
  | "PROJETO"
  | "APROVACAO"
  | "CHAMADO"
  | "FINANCEIRO"
  | "CHECKLIST";

export type WorkUpdateComment = {
  id: string;
  message: string;
  createdAt?: string;
  author?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    role?: ApiRole;
  };
};

export type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority?: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  mediaUrl?: string;
  mediaContentType?: string;
  commentsCount?: number;
  openedBy?: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string };
  createdAt?: string;
};

export type TicketMessage = {
  id: string;
  message: string;
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt?: string;
  sender?: { id: string; fullName: string };
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  fullName: string;
  cpf: string;
  role: ApiRole;
  status: string;
};

export type SupplyRequest = {
  id: string;
  itemName: string;
  quantity: string;
  observation?: string;
  status: string;
};

export type PricingEstimate = {
  id: string;
  areaM2: number;
  pricePerM2: number;
  complexityPercent: number;
  marginPercent: number;
  suggestedAmount: number;
};

export type SheetEntry = {
  id: string;
  item: string;
  category: string;
  amount: number;
  formula?: string;
  status: string;
};

export type Inspection = {
  id: string;
  title: string;
  scheduledFor: string;
  location?: string;
  notes?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  contentType?: string;
};

export type DailyLog = {
  id: string;
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
  createdAt?: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
};

export type ChatMessage = {
  id: string;
  channel: string;
  message: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  replyToId?: string;
  viewedAt?: string;
  createdAt?: string;
  sender?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    role?: ApiRole;
  };
};

export type ChecklistItem = {
  id: string;
  stage: string;
  title: string;
  approved: boolean;
  photoUrl?: string;
  comment?: string;
  signature?: string;
  responsible?: { id: string; fullName: string };
};

export type EvolutionComparison = {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  title?: string;
  createdAt?: string;
  createdBy?: { id: string; fullName: string };
};

export type AppNotification = {
  id: string;
  type:
    | "INVITATION"
    | "TICKET_RECEIVED"
    | "TICKET_ANSWERED"
    | "PROJECT_UPDATED"
    | "APPROVAL_PENDING"
    | "DAILY_UPDATE_PENDING"
    | "MATERIAL_MISSING"
    | "NEW_COMMENT"
    | "NEW_UPLOAD";
  title: string;
  message: string;
  projectId?: string;
  invitationId?: string;
  ticketId?: string;
  createdAt?: string;
  read?: boolean;
};
