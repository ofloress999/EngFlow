import { Activity, AlertCircle, CheckCircle2, Clock3, HardHat, WalletCards } from "lucide-react";
import { Metric, ProgressBar, Stat } from "../../components";
import type { AppNotification, Project } from "../../types";
import { money, relativeTime } from "../../utils/format";

type GlobalDashboardProps = {
  projects: Project[];
  notifications: AppNotification[];
  onOpenProject: (id: string) => void;
};

export function GlobalDashboard({ projects, notifications, onOpenProject }: GlobalDashboardProps) {
  const active = projects.filter((project) => project.status === "Em andamento").length;
  const done = projects.filter((project) => project.status === "Concluida").length;
  const spent = projects.reduce((total, project) => total + project.spent, 0);
  const progress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0;
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-5">
        <Stat title="Obras ativas" value={`${active}`} detail="em execucao" />
        <Stat title="Concluidas" value={`${done}`} detail="entregues" />
        <Stat title="Gastos totais" value={money(spent)} detail="consolidado" />
        <Stat title="Pendencias" value={`${unread}`} detail="notificacoes" />
        <Stat title="Progresso medio" value={`${progress}%`} detail="portfolio" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.62fr]">
        <div className="panel rounded-[2rem] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Portfolio de obras</h2>
              <p className="muted mt-1">Visao executiva para comparar andamento, custo e proximas entregas.</p>
            </div>
            <HardHat className="text-[var(--accent-strong)]" size={28} />
          </div>
          <div className="grid gap-3">
            {projects.slice(0, 5).map((project) => (
              <button
                className="panel-flat rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
                key={project.id}
                onClick={() => onOpenProject(project.id)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">{project.name}</p>
                    <p className="muted text-sm">{project.status} | {project.deadline}</p>
                  </div>
                  <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} />
              </button>
            ))}
            {projects.length === 0 && <p className="surface-soft rounded-2xl p-4 font-semibold">Nenhuma obra carregada.</p>}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="panel rounded-[2rem] p-5">
            <h2 className="text-xl font-black">Atividades recentes</h2>
            <div className="mt-4 grid gap-3">
              {notifications.slice(0, 5).map((notification) => (
                <article className="panel-flat rounded-2xl p-4" key={notification.id}>
                  <div className="flex items-start gap-3">
                    {notification.read ? <CheckCircle2 size={18} /> : <AlertCircle className="text-rose-500" size={18} />}
                    <div>
                      <p className="font-black">{notification.title}</p>
                      <p className="muted mt-1 text-sm leading-6">{notification.message}</p>
                      <p className="subtle mt-2 flex items-center gap-1 text-xs font-bold">
                        <Clock3 size={13} />
                        {relativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {notifications.length === 0 && <p className="surface-soft rounded-2xl p-4 font-semibold">Sem atividades recentes.</p>}
            </div>
          </section>

          <section className="panel rounded-[2rem] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="text-[var(--accent-strong)]" size={20} />
              <h2 className="text-xl font-black">Saude operacional</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Chamados pendentes" value={`${notifications.filter((item) => item.type === "TICKET_RECEIVED").length}`} />
              <Metric label="Financeiro" value={money(spent)} />
              <Metric label="Projetos aprovados" value={`${projects.filter((item) => item.progress >= 80).length}`} />
              <Metric label="Aprovacoes" value={`${notifications.filter((item) => item.type === "APPROVAL_PENDING").length}`} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--accent-strong)]">
              <WalletCards size={16} />
              Dados consolidados em tempo real quando o backend estiver ativo.
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
