import { CheckCheck, FileUp, MessageCircle, Paperclip, Reply, Send, Smile, UserPlus } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import type { ChatMessage, ProjectMember } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { connectProjectRealtime } from "../../utils/realtime";

type ProjectChatViewProps = {
  actorUserId: string;
  projectId?: string;
};

export function ProjectChatView({ actorUserId, projectId }: ProjectChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [activeChannel, setActiveChannel] = useState("");
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const collaborators = members.filter((member) => member.userId !== actorUserId);
  const selectedRecipient = collaborators.find((member) => member.userId === selectedRecipientId);
  const activeRecipient = collaborators.find((member) => activeChannel.includes(member.userId));
  const generalChannel = projectId ? `project:${projectId}:general` : "";
  const replyTarget = useMemo(() => messages.find((item) => item.id === replyToId), [messages, replyToId]);

  async function loadMembers() {
    if (!projectId) return;
    const loaded = await engflowApi.listMembers(projectId, actorUserId);
    setMembers(loaded);
    setActiveChannel((current) => current || `project:${projectId}:general`);
  }

  async function loadMessages(targetChannel = activeChannel) {
    if (!projectId || !targetChannel) {
      setMessages([]);
      return;
    }
    setMessages(await engflowApi.listChatMessages(projectId, actorUserId, targetChannel));
  }

  useEffect(() => {
    loadMembers().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar colaboradores.")));
  }, [projectId, actorUserId]);

  useEffect(() => {
    loadMessages().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar a conversa.")));
  }, [projectId, actorUserId, activeChannel]);

  useEffect(() => {
    if (!projectId) return;
    return connectProjectRealtime(projectId, (event) => {
      if (event.type === "CHAT_MESSAGE_SENT") {
        loadMessages(activeChannel).catch(() => undefined);
      }
    });
  }, [projectId, actorUserId, activeChannel]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !activeChannel || (!draft.trim() && !attachment)) return;
    try {
      await engflowApi.sendChatMessage(projectId, {
        actorUserId,
        channel: activeChannel,
        message: draft.trim() || attachment?.name || "Anexo enviado",
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
        attachmentName: attachment?.name,
        replyToId,
      });
      setDraft("");
      setAttachment(null);
      setReplyToId(undefined);
      await loadMessages();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel enviar a mensagem."));
    }
  }

  async function handleAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachment({ url: await fileToDataUrl(file), type: file.type, name: file.name });
  }

  if (!projectId) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Chat da obra</h2>
        <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Chat da obra</h2>
          <p className="muted mt-1">Converse individualmente com colaboradores da obra.</p>
        </div>
        <span className="badge-accent w-fit rounded-full px-3 py-1 text-xs font-black">1v1 privado</span>
      </div>

      {message && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{message}</p>}

      <div className="grid min-h-[34rem] gap-4 xl:grid-cols-[20rem_1fr]">
        <aside className="surface-soft grid max-h-80 content-start gap-3 overflow-y-auto rounded-3xl p-3 scrollbar-soft xl:max-h-none">
          <button
            className={`btn-secondary flex items-center gap-3 px-3 py-3 text-left text-sm font-bold ${activeChannel === generalChannel ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveChannel(generalChannel);
              setSelectedRecipientId("");
              setReplyToId(undefined);
            }}
          >
            <MessageCircle size={17} />
            Chat geral da obra
          </button>
          <div className="flex items-center gap-2 px-2 font-black">
            <UserPlus size={18} />
            Iniciar conversa
          </div>
          {collaborators.length > 0 && (
            <div className="grid gap-2">
              <select
                className="input-shell rounded-xl px-3 py-3 text-sm font-bold"
                value={selectedRecipientId}
                onChange={(event) => setSelectedRecipientId(event.target.value)}
              >
                <option value="">Selecione um colaborador</option>
                {collaborators.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName} - {member.role}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary px-3 py-3 text-sm font-bold disabled:opacity-50"
                type="button"
                disabled={!selectedRecipientId}
                onClick={() => {
                  setActiveChannel(directChannel(actorUserId, selectedRecipientId));
                  setReplyToId(undefined);
                }}
              >
                Iniciar chat
              </button>
            </div>
          )}
          {collaborators.map((member) => (
            <button
              className={`btn-secondary flex items-center gap-3 px-3 py-3 text-left text-sm font-bold ${activeChannel === directChannel(actorUserId, member.userId) ? "active" : ""}`}
              key={member.userId}
              type="button"
              onClick={() => {
                setActiveChannel(directChannel(actorUserId, member.userId));
                setSelectedRecipientId(member.userId);
                setReplyToId(undefined);
              }}
            >
              <MessageCircle size={17} />
              <span className="min-w-0">
                <span className="block truncate">{member.fullName}</span>
                <span className="muted block text-xs">{member.role}</span>
              </span>
            </button>
          ))}
          {collaborators.length === 0 && <p className="muted rounded-2xl p-3 text-sm font-semibold">Nenhum outro colaborador nesta obra.</p>}
        </aside>

        <div className="grid min-h-[70vh] grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] xl:min-h-[34rem]">
          <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-black">{activeChannel === generalChannel ? "Chat geral da obra" : activeRecipient?.fullName ?? selectedRecipient?.fullName ?? "Escolha um colaborador"}</p>
            <p className="muted mt-1 text-xs font-bold">{activeChannel === generalChannel ? "Todos os membros da obra" : "Conversa privada da obra"}</p>
          </div>

          <div className="scrollbar-soft grid content-start gap-3 overflow-y-auto p-4">
            {messages.map((item) => {
              const mine = item.sender?.id === actorUserId;
              const replied = item.replyToId ? messages.find((chatMessage) => chatMessage.id === item.replyToId) : undefined;
              return (
                <article className={`max-w-[92%] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:max-w-[86%] ${mine ? "ml-auto" : ""}`} key={item.id}>
                  {replied && <p className="mb-2 rounded-xl bg-teal-500/10 p-2 text-xs font-bold text-teal-700">Resposta: {replied.message}</p>}
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{item.sender?.fullName ?? "Colaborador"}</p>
                    <button className="icon-button p-1" type="button" title="Responder" onClick={() => setReplyToId(item.id)}>
                      <Reply size={14} />
                    </button>
                  </div>
                  <p className="text-sm leading-6">{item.message}</p>
                  <AttachmentPreview item={item} />
                  <div className="muted mt-2 flex items-center justify-end gap-1 text-xs font-bold">
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    <CheckCheck size={14} />
                  </div>
                </article>
              );
            })}
            {messages.length === 0 && <p className="m-auto rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">Nenhuma mensagem nesta conversa.</p>}
          </div>

          <form className="border-t border-[var(--border)] bg-[var(--surface)] p-3" onSubmit={handleSubmit}>
            {replyTarget && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-teal-500/10 p-2 text-sm font-bold text-teal-700">
                Respondendo: {replyTarget.message}
                <button className="icon-button px-2 py-1 text-xs" type="button" onClick={() => setReplyToId(undefined)}>Cancelar</button>
              </div>
            )}
            {attachment && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-soft)] p-2 text-sm font-bold">
                <span className="flex min-w-0 items-center gap-2"><Paperclip size={15} />{attachment.name}</span>
                <button className="icon-button px-2 py-1 text-xs" type="button" onClick={() => setAttachment(null)}>Remover</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="icon-button flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center" title="Anexar arquivo">
                <FileUp size={18} />
                <input className="sr-only" type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleAttachment} />
              </label>
              <button className="icon-button h-11 w-11 shrink-0" type="button" title="Emoji" onClick={() => setDraft((current) => `${current} :)`)}>
                <Smile size={18} />
              </button>
              <input className="input-shell min-w-0 flex-1 rounded-xl px-3 py-3 sm:px-4" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={activeChannel ? "Mensagem" : "Escolha uma conversa"} disabled={!activeChannel} />
              <button className="btn-primary h-11 w-11 shrink-0 disabled:opacity-50" title="Enviar" disabled={!activeChannel}>
                <Send className="mx-auto" size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function AttachmentPreview({ item }: { item: ChatMessage }) {
  if (!item.attachmentUrl) return null;
  if (item.attachmentType?.startsWith("image/")) {
    return <img className="mt-3 max-h-64 rounded-2xl object-cover" src={item.attachmentUrl} alt={item.attachmentName ?? "Anexo"} />;
  }
  if (item.attachmentType?.startsWith("audio/")) {
    return <audio className="mt-3 w-full" src={item.attachmentUrl} controls />;
  }
  return (
    <a className="btn-secondary mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-bold" href={item.attachmentUrl} download={item.attachmentName}>
      <Paperclip size={15} />
      {item.attachmentName ?? "Baixar anexo"}
    </a>
  );
}

function directChannel(firstUserId: string, secondUserId: string) {
  return firstUserId.localeCompare(secondUserId) <= 0
    ? `dm:${firstUserId}:${secondUserId}`
    : `dm:${secondUserId}:${firstUserId}`;
}
