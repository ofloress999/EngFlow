import { AlertTriangle, CheckCircle2, ImagePlus, MessageSquare, Paperclip, Plus, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { Project, ProjectMember, Ticket, TicketMessage } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { connectProjectRealtime } from "../../utils/realtime";

type TicketsViewProps = {
  actorUserId: string;
  projectId?: string;
  projects?: Project[];
  canRespond: boolean;
  canCreate: boolean;
  onRefreshNotifications?: () => Promise<void>;
  compact?: boolean;
};

type TicketFilter = "Todos" | "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "CANCELADO";
type DisplayTicket = Ticket & { projectId?: string; projectName?: string };

const statuses: TicketFilter[] = ["Todos", "ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "CANCELADO"];
const priorities: NonNullable<Ticket["priority"]>[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];

export function TicketsView({
  actorUserId,
  projectId,
  projects = [],
  canRespond,
  canCreate,
  onRefreshNotifications,
  compact = false,
}: TicketsViewProps) {
  const isGlobal = !compact && projects.length > 0;
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [filter, setFilter] = useState<TicketFilter>(isGlobal ? "ABERTO" : "Todos");
  const [projectFilter, setProjectFilter] = useState("Todas");
  const [projectForForm, setProjectForForm] = useState(projectId ?? projects[0]?.id ?? "");
  const [form, setForm] = useState({
    assignedToUserId: "",
    priority: "MEDIA" as NonNullable<Ticket["priority"]>,
    subject: "",
    description: "",
    mediaUrl: "",
    mediaContentType: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerAttachment, setAnswerAttachment] = useState<Record<string, { url: string; type: string }>>({});
  const [openThreads, setOpenThreads] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isCompactOpen, setIsCompactOpen] = useState(false);
  const technicalMembers = members.filter(isTechnicalResponsible);

  const filteredTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => (filter === "Todos" ? true : ticket.status === filter))
        .filter((ticket) => (!isGlobal || projectFilter === "Todas" ? true : ticket.projectId === projectFilter)),
    [filter, isGlobal, projectFilter, tickets],
  );

  async function load() {
    const targetProjectId = isGlobal ? projectForForm : projectId;
    if (!targetProjectId) return;
    const loadedTickets = isGlobal
      ? (
          await Promise.all(
            projects.map(async (project) =>
              (await engflowApi.listTickets(project.id, actorUserId)).map((ticket) => ({
                ...ticket,
                projectId: project.id,
                projectName: project.name,
              })),
            ),
          )
        )
          .flat()
          .sort((first, second) => dateTime(second.createdAt) - dateTime(first.createdAt))
      : (await engflowApi.listTickets(targetProjectId, actorUserId)).map((ticket) => ({ ...ticket, projectId: targetProjectId }));
    const loadedMembers = await engflowApi.listMembers(targetProjectId, actorUserId);
    const defaultManager = loadedMembers.find(isTechnicalResponsible)?.userId ?? "";

    setTickets(loadedTickets);
    setMembers(loadedMembers);
    setForm((current) => ({
      ...current,
      assignedToUserId: loadedMembers.some((member) => isTechnicalResponsible(member) && member.userId === current.assignedToUserId)
        ? current.assignedToUserId
        : defaultManager,
    }));
    setMessage(null);
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar chamados.")));
  }, [projectId, actorUserId, projectForForm, projects.length]);

  useEffect(() => {
    if (!projectId) return;
    return connectProjectRealtime(projectId, (event) => {
      if (event.type === "TICKET_UPDATED") {
        load().catch(() => undefined);
      }
    });
  }, [projectId, actorUserId]);

  useEffect(() => {
    if (projectId) setProjectForForm(projectId);
    else if (!projectForForm && projects[0]) setProjectForForm(projects[0].id);
  }, [projectId, projects, projectForForm]);

  async function handleOpenTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetProjectId = isGlobal ? projectForForm : projectId;
    if (!targetProjectId) return;
    try {
      await engflowApi.openTicket(targetProjectId, {
        actorUserId,
        assignedToUserId: form.assignedToUserId,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        mediaUrl: form.mediaUrl || undefined,
        mediaContentType: form.mediaContentType || undefined,
      });
      setForm({ ...form, subject: "", description: "", mediaUrl: "", mediaContentType: "" });
      await load();
      await onRefreshNotifications?.();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel abrir chamado."));
    }
  }

  async function handleTicketMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm({ ...form, mediaUrl: await fileToDataUrl(file), mediaContentType: file.type });
  }

  async function handleAnswerAttachment(ticketId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnswerAttachment({ ...answerAttachment, [ticketId]: { url: await fileToDataUrl(file), type: file.type } });
  }

  async function handleAnswer(ticketId: string) {
    try {
      await engflowApi.answerTicket(ticketId, {
        actorUserId,
        message: answers[ticketId] ?? "Anexo enviado",
        attachmentUrl: answerAttachment[ticketId]?.url,
        attachmentType: answerAttachment[ticketId]?.type,
      });
      setAnswers({ ...answers, [ticketId]: "" });
      setAnswerAttachment({ ...answerAttachment, [ticketId]: undefined as never });
      await load();
      if (openThreads[ticketId]) await loadThread(ticketId);
      await onRefreshNotifications?.();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel comentar no chamado."));
    }
  }

  async function handleStatus(ticketId: string, status: Exclude<TicketFilter, "Todos">) {
    await engflowApi.updateTicketStatus(ticketId, { actorUserId, status });
    await load();
    await onRefreshNotifications?.();
  }

  async function toggleThread(ticketId: string) {
    const open = !openThreads[ticketId];
    setOpenThreads({ ...openThreads, [ticketId]: open });
    if (open && !messages[ticketId]) await loadThread(ticketId);
  }

  async function loadThread(ticketId: string) {
    setMessages((current) => ({
      ...current,
      [ticketId]: [],
    }));
    const loaded = await engflowApi.listTicketMessages(ticketId, actorUserId);
    setMessages((current) => ({ ...current, [ticketId]: loaded }));
  }

  function renderTicketForm(className: string) {
    return (
      <form className={className} onSubmit={handleOpenTicket}>
        <div className="flex items-center gap-2 font-black">
          <Plus size={18} />
          Abrir chamado
        </div>
        {isGlobal && (
          <label className="block">
            <span className="muted mb-2 block text-sm font-semibold">Obra</span>
            <select className="input-shell rounded-xl px-4 py-3" value={projectForForm} onChange={(event) => setProjectForForm(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="muted mb-2 block text-sm font-semibold">Responsavel tecnico</span>
          <select className="input-shell rounded-xl px-4 py-3" value={form.assignedToUserId} onChange={(event) => setForm({ ...form, assignedToUserId: event.target.value })}>
            <option value="">{technicalMembers.length === 0 ? "Nenhum engenheiro/arquiteto na obra" : "Selecione"}</option>
            {technicalMembers.map((member) => <option key={member.userId} value={member.userId}>{member.fullName} - {formatRole(member.role)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="muted mb-2 block text-sm font-semibold">Prioridade</span>
          <select className="input-shell rounded-xl px-4 py-3" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as NonNullable<Ticket["priority"]> })}>
            {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <Field label="Titulo" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} placeholder="Vazamento no pavimento 2" />
        <Field label="Descricao" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Descreva a ocorrencia tecnica" multiline />
        <label className="surface-soft cursor-pointer rounded-2xl border-dashed p-4 text-sm font-semibold">
          <span className="flex items-center gap-2"><ImagePlus size={17} />Anexar foto ou video</span>
          <input className="sr-only" type="file" accept="image/*,video/*" onChange={handleTicketMedia} />
        </label>
        {form.mediaUrl && <MediaPreview url={form.mediaUrl} contentType={form.mediaContentType} />}
        <button className="btn-primary px-4 py-3 font-bold disabled:opacity-50" disabled={!form.assignedToUserId}>Salvar chamado</button>
      </form>
    );
  }

  function renderTicketsList(className: string) {
    return (
      <div className={className}>
        {filteredTickets.map((ticket) => (
          <article className="panel-flat rounded-2xl p-4" key={ticket.id}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">{ticket.status}</span>
                  <span className="badge rounded-full px-3 py-1 text-xs font-black">{ticket.priority ?? "MEDIA"}</span>
                </div>
                <h3 className="font-black">{ticket.subject}</h3>
                <p className="muted mt-1 text-sm">De {ticket.openedBy?.fullName ?? "usuario"} para {ticket.assignedTo?.fullName ?? "responsavel"}</p>
                {isGlobal && <p className="muted mt-1 text-xs font-bold">{ticket.projectName ?? "Obra"}</p>}
              </div>
              <AlertTriangle className="text-[var(--accent-strong)]" size={20} />
            </div>
            <p className="text-sm leading-6">{ticket.description}</p>
            <MediaPreview url={ticket.mediaUrl} contentType={ticket.mediaContentType} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={() => toggleThread(ticket.id)}>
                <MessageSquare size={16} />
                {ticket.commentsCount ?? messages[ticket.id]?.length ?? 0}
              </button>
              {canRespond && statuses.filter((status) => status !== "Todos").map((status) => (
                <button className="btn-secondary px-3 py-2 text-xs font-bold" type="button" key={status} onClick={() => handleStatus(ticket.id, status)}>
                  {status === "RESOLVIDO" ? <CheckCircle2 className="mr-1 inline" size={14} /> : null}
                  {status}
                </button>
              ))}
            </div>
            {openThreads[ticket.id] && (
              <div className="mt-4 grid gap-3">
                {(messages[ticket.id] ?? []).map((item) => (
                  <div className="surface-soft rounded-2xl p-3" key={item.id}>
                    <p className="text-sm font-black">{item.sender?.fullName ?? "Colaborador"}</p>
                    <p className="muted mt-1 text-sm">{item.message}</p>
                    <MediaPreview url={item.attachmentUrl} contentType={item.attachmentType} compact />
                  </div>
                ))}
                {canRespond && (
                  <div className="flex gap-2">
                    <input className="input-shell min-w-0 flex-1 rounded-xl px-3 py-2" placeholder="Comentar chamado" value={answers[ticket.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [ticket.id]: event.target.value })} />
                    <label className="icon-button flex w-11 shrink-0 cursor-pointer items-center justify-center" title="Anexar evidencia">
                      <Paperclip size={17} />
                      <input className="sr-only" type="file" accept="image/*,video/*,.pdf" onChange={(event) => handleAnswerAttachment(ticket.id, event)} />
                    </label>
                    <button className="btn-primary p-3" title="Enviar" type="button" onClick={() => handleAnswer(ticket.id)}><Send size={18} /></button>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
        {filteredTickets.length === 0 && <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">Nenhum chamado encontrado.</p>}
      </div>
    );
  }

  if (!projectId) return <EmptyBox title="Chamados tecnicos" />;

  if (compact) {
    return (
      <section className="relative flex justify-end">
        <button className="icon-button relative flex h-12 w-12 items-center justify-center" type="button" title="Chamados tecnicos" aria-label="Chamados tecnicos" aria-expanded={isCompactOpen} onClick={() => setIsCompactOpen((current) => !current)}>
          <MessageSquare size={21} />
          {tickets.length > 0 && <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-teal-400 px-1.5 py-0.5 text-xs font-black text-slate-950">{tickets.length}</span>}
        </button>
        {isCompactOpen && (
          <div className="panel absolute right-0 top-14 z-30 w-[min(92vw,34rem)] rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-black">Chamados tecnicos</h2>
              <button className="icon-button p-2" title="Fechar chamados" type="button" onClick={() => setIsCompactOpen(false)}><X size={16} /></button>
            </div>
            {message && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{message}</p>}
            {canCreate && renderTicketForm("surface-soft mb-4 grid gap-3 rounded-2xl p-3")}
            {renderTicketsList("grid max-h-80 gap-3 overflow-y-auto pr-1 scrollbar-soft")}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Chamados tecnicos</h2>
          <p className="muted mt-1">Ocorrencias tecnicas com prioridade, status, midia e comentarios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isGlobal && (
            <select className="input-shell w-fit rounded-2xl px-4 py-3 text-sm font-bold" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="Todas">Todas as obras</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
          <select className="input-shell w-fit rounded-2xl px-4 py-3 text-sm font-bold" value={filter} onChange={(event) => setFilter(event.target.value as TicketFilter)}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>
      {message && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{message}</p>}
      {canCreate ? (
        <div className="grid gap-6 xl:grid-cols-[0.68fr_1fr]">
          {renderTicketForm("surface-soft grid gap-3 rounded-3xl p-4")}
          {renderTicketsList("grid gap-3")}
        </div>
      ) : renderTicketsList("grid gap-3")}
    </section>
  );
}

function MediaPreview({ url, contentType, compact = false }: { url?: string; contentType?: string; compact?: boolean }) {
  if (!url) return null;
  if (contentType?.startsWith("video/")) {
    return <video className={`mt-3 w-full rounded-2xl bg-black object-contain ${compact ? "max-h-48" : "max-h-80"}`} src={url} controls />;
  }
  if (contentType?.startsWith("image/") || url.startsWith("data:image")) {
    return <img className={`mt-3 w-full rounded-2xl object-cover ${compact ? "max-h-48" : "max-h-80"}`} src={url} alt="Evidencia do chamado" />;
  }
  return <a className="btn-secondary mt-3 inline-flex px-3 py-2 text-sm font-bold" href={url} download>Anexo</a>;
}

function isTechnicalResponsible(member: ProjectMember) {
  const role = member.role.toUpperCase();
  return role === "ADMIN" || role === "ENGENHEIRO" || role === "ARQUITETO";
}

function formatRole(role: ProjectMember["role"]) {
  return role.toLowerCase().replace("_", " ");
}

function dateTime(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function EmptyBox({ title }: { title: string }) {
  return (
    <section className="panel rounded-[2rem] p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
    </section>
  );
}
