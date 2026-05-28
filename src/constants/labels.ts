import type { ApiRole, ProjectStatus, Role } from "../types";

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  engenheiro: "Engenheiro",
  arquiteto: "Arquiteta",
  pedreiro: "Pedreiro",
  cliente: "Cliente",
};

export const apiRoleLabels: Record<ApiRole, string> = {
  ADMIN: "Administrador",
  ENGENHEIRO: "Engenheiro",
  ARQUITETO: "Arquiteta",
  PEDREIRO: "Pedreiro",
  CLIENTE: "Cliente",
};

export const projectStatuses: ProjectStatus[] = [
  "Em andamento",
  "Concluida",
  "Pausada",
  "Em planejamento",
];
