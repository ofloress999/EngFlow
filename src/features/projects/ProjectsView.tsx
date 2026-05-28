import { CalendarDays, ListFilter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Metric, ProgressBar } from "../../components";
import { projectStatuses } from "../../constants/labels";
import type { Project } from "../../types";
import { money } from "../../utils/format";

type ProjectsViewProps = {
  canManage: boolean;
  isClient: boolean;
  projects: Project[];
  onCreate: () => void;
  onOpen: (id: string) => void;
};

export function ProjectsView({ canManage, isClient, projects, onCreate, onOpen }: ProjectsViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === "Todos" || project.status === status;
        return matchesSearch && matchesStatus;
      }),
    [projects, search, status],
  );
  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              {isClient ? "Acompanhamento" : "Operacao"}
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {isClient ? "Minhas Obras" : canManage ? "Gerenciar Obras" : "Obras"}
            </h2>
            <p className="muted mt-2 max-w-2xl">
              {isClient
                ? "Acompanhe progresso, cronograma, projetos, financeiro e atualizacoes."
                : "Filtre, compare e acesse rapidamente cada obra ativa no ecossistema."}
            </p>
          </div>
          {canManage && (
            <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold" onClick={onCreate}>
              <Plus size={18} />
              Criar nova obra
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Obras" value={`${projects.length}`} />
          <Metric label="Andamento medio" value={`${averageProgress}%`} />
          <Metric label="Investimento total" value={money(projects.reduce((total, project) => total + project.invested, 0))} />
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_auto]">
        <label className="input-shell flex items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="subtle" size={18} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome da obra"
          />
        </label>
        <div className="panel-flat flex gap-2 overflow-x-auto rounded-2xl p-2 scrollbar-soft">
          {["Todos", ...projectStatuses].map((item) => (
            <button
              className={`btn-secondary shrink-0 px-3 py-2 text-sm font-bold ${status === item ? "active" : ""}`}
              key={item}
              onClick={() => setStatus(item)}
            >
              {item === "Todos" && <ListFilter className="mr-2 inline" size={15} />}
              {item}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 && (
        <section className="panel rounded-[2rem] p-8 text-center">
          <h3 className="text-xl font-black">Nenhuma obra encontrada</h3>
          <p className="muted mt-2">Ajuste os filtros ou aceite um convite para visualizar uma obra.</p>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {filtered.map((project) => (
          <button
            key={project.id}
            className="panel group rounded-[2rem] p-5 text-left transition hover:-translate-y-1 hover:border-[var(--border-strong)]"
            onClick={() => onOpen(project.id)}
          >
            {project.photoUrl && (
              <img className="mb-4 h-36 w-full rounded-2xl object-cover" src={project.photoUrl} alt={project.name} />
            )}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-black tracking-tight">{project.name}</h3>
                <p className="muted mt-1 text-sm">{project.address}</p>
              </div>
              <span className="badge-accent shrink-0 rounded-full px-3 py-1 text-xs font-black">
                {project.status}
              </span>
            </div>
            <ProgressBar value={project.progress} />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Cliente" value={project.client ?? "Vinculado"} />
              <Metric label="Gasto" value={money(project.spent)} />
              <Metric label="Inicio" value={project.start ?? "Sem data"} />
              <Metric label="Previsao" value={project.deadline} />
            </div>
            <div className="muted mt-5 flex items-center gap-2 text-sm font-bold">
              <CalendarDays size={16} />
              Abrir detalhes
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
