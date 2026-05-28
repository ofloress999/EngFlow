import type { Role, View } from "../types";

const viewPermissions: Record<View, Role[]> = {
  global: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
  obras: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
  "nova-obra": ["admin", "engenheiro", "arquiteto"],
  obra: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
  perfil: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
  chamados: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
  financeiro: ["admin", "engenheiro", "arquiteto", "cliente"],
  projetos: ["admin", "engenheiro", "arquiteto", "cliente"],
  precificacao: ["admin", "engenheiro", "arquiteto"],
  planilhas: ["admin", "engenheiro", "arquiteto"],
  vistoria: ["admin", "engenheiro", "arquiteto"],
  insumos: ["admin", "pedreiro"],
  atualizacoes: ["admin", "engenheiro", "arquiteto", "pedreiro", "cliente"],
};

export function canAccessView(role: Role, view: View) {
  return viewPermissions[view]?.includes(role) ?? false;
}

export function isManagerRole(role: Role) {
  return role === "admin" || role === "engenheiro" || role === "arquiteto";
}
