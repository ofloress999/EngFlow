import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileText,
  Heart,
  MessageCircle,
  Paperclip,
  Pin,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { WorkUpdate, WorkUpdateComment, WorkUpdateType } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { connectProjectRealtime } from "../../utils/realtime";

type UpdatesViewProps = {
  actorUserId: string;
  projectId?: string;
  canCreate: boolean;
  isClient?: boolean;
  compact?: boolean;
};

type SortMode = "recentes" | "antigas" | "fixados";

const updateTypes: { value: WorkUpdateType | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "OBRA", label: "Obra" },
  { value: "FOTO", label: "Fotos" },
  { value: "VIDEO", label: "Videos" },
  { value: "PROJETO", label: "Projeto" },
  { value: "APROVACAO", label: "Aprovacao" },
  { value: "CHAMADO", label: "Chamado" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "CHECKLIST", label: "Checklist" },
];

const typeLabels: Record<WorkUpdateType, string> = {
  OBRA: "Obra",
  FOTO: "Foto",
  VIDEO: "Video",
  PROJETO: "Projeto",
  APROVACAO: "Aprovacao",
  CHAMADO: "Chamado",
  FINANCEIRO: "Financeiro",
  CHECKLIST: "Checklist",
};

export function UpdatesView({
  actorUserId,
  projectId,
  canCreate,
  isClient,
  compact = false,
}: UpdatesViewProps) {
  const [updates, setUpdates] = useState<WorkUpdate[]>([]);
  const [comments, setComments] = useState<Record<string, WorkUpdateComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<WorkUpdateType | "TODOS">("TODOS");
  const [sort, setSort] = useState<SortMode>("recentes");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "OBRA" as WorkUpdateType,
    photoUrl: "",
    mediaUrl: "",
    mediaContentType: "",
    progressPercent: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const hasTodayUpdate = useMemo(
    () => updates.some((update) => update.createdAt && new Date(update.createdAt).toDateString() === new Date().toDateString()),
    [updates],
  );

  const filteredUpdates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = updates.filter((update) => {
      const matchesType = filter === "TODOS" || update.type === filter;
      const haystack = `${update.title} ${update.description} ${update.createdBy?.name ?? ""}`.toLowerCase();
      return matchesType && (!query || haystack.includes(query));
    });

    return [...result].sort((first, second) => {
      if (sort === "fixados") {
        return Number(Boolean(second.pinned)) - Number(Boolean(first.pinned)) || dateTime(second.createdAt) - dateTime(first.createdAt);
      }
      if (sort === "antigas") return dateTime(first.createdAt) - dateTime(second.createdAt);
      return dateTime(second.createdAt) - dateTime(first.createdAt);
    });
  }, [filter, search, sort, updates]);

  async function load() {
    if (!projectId) return;
    setUpdates(await engflowApi.listUpdates(projectId, actorUserId));
  }

  useEffect(() => {
    load().catch(() => setMessage("Nao foi possivel carregar atualizacoes."));
  }, [projectId, actorUserId]);

  useEffect(() => {
    if (!projectId) return;
    return connectProjectRealtime(projectId, (event) => {
      if (event.type === "TIMELINE_UPDATED") {
        load().catch(() => undefined);
      }
    });
  }, [projectId, actorUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    if (!form.title.trim() || !form.description.trim()) {
      setMessage("Informe titulo e descricao antes de publicar.");
      return;
    }
    setIsPublishing(true);
    try {
      const created = await engflowApi.addUpdate(projectId, {
        actorUserId,
        title: form.title,
        description: form.description,
        type: form.type,
        photoUrl: form.photoUrl || undefined,
        mediaUrl: form.mediaUrl || form.photoUrl || undefined,
        mediaContentType: form.mediaContentType || undefined,
        progressPercent: form.progressPercent ? Number(form.progressPercent) : undefined,
      });
      setForm({ title: "", description: "", type: "OBRA", photoUrl: "", mediaUrl: "", mediaContentType: "", progressPercent: "" });
      setUpdates((current) => uniqueById([created, ...current]));
      setMessage(null);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel registrar andamento."));
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleMediaSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const isVideo = file.type.startsWith("video/");
    setForm({
      ...form,
      type: isVideo ? "VIDEO" : "FOTO",
      photoUrl: isVideo ? form.photoUrl : dataUrl,
      mediaUrl: dataUrl,
      mediaContentType: file.type,
      title: form.title || file.name,
    });
  }

  function removeSelectedMedia() {
    setForm({ ...form, photoUrl: "", mediaUrl: "", mediaContentType: "" });
  }

  async function handleLike(updateId: string) {
    const liked = await engflowApi.likeUpdate(updateId, actorUserId);
    setUpdates((current) => current.map((update) => (update.id === updateId ? liked : update)));
  }

  async function handlePin(update: WorkUpdate) {
    const pinned = await engflowApi.pinUpdate(update.id, actorUserId, !update.pinned);
    setUpdates((current) => current.map((item) => (item.id === update.id ? pinned : item)));
  }

  async function toggleComments(updateId: string) {
    const nextOpen = !openComments[updateId];
    setOpenComments({ ...openComments, [updateId]: nextOpen });
    if (nextOpen && !comments[updateId]) {
      setComments({ ...comments, [updateId]: await engflowApi.listUpdateComments(updateId, actorUserId) });
    }
  }

  async function handleComment(updateId: string) {
    const messageText = commentDrafts[updateId]?.trim();
    if (!messageText) return;
    const comment = await engflowApi.addUpdateComment(updateId, { actorUserId, message: messageText });
    setComments((current) => ({ ...current, [updateId]: [...(current[updateId] ?? []), comment] }));
    setCommentDrafts({ ...commentDrafts, [updateId]: "" });
    setUpdates((current) =>
      current.map((update) =>
        update.id === updateId ? { ...update, commentsCount: (update.commentsCount ?? 0) + 1 } : update,
      ),
    );
  }

  if (!projectId) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Timeline da obra</h2>
        <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Timeline da obra</h2>
          <p className="muted mt-1">
            {isClient ? "Fotos, aprovacoes e historico de progresso." : "Feed cronologico com obra, projetos, chamados, financeiro e checklist."}
          </p>
        </div>
        {canCreate && (
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-black ${
            hasTodayUpdate ? "badge-accent" : "border border-amber-400/30 bg-amber-400/10 text-amber-600"
          }`}>
            <AlertCircle size={15} />
            {hasTodayUpdate ? "Atualizacao de hoje enviada" : "Atualizacao diaria nao enviada"}
          </span>
        )}
      </div>

      {message && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{message}</p>}

      <div className={`grid gap-6 ${compact ? "" : "xl:grid-cols-[0.68fr_1fr]"}`}>
        {canCreate && (
          <form className="surface-soft grid gap-3 rounded-3xl p-4" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 font-black">
              <UploadCloud size={18} />
              Nova publicacao
            </div>
            <label className="block">
              <span className="muted mb-2 block text-sm font-semibold">Tipo</span>
              <select
                className="input-shell rounded-xl px-4 py-3"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as WorkUpdateType })}
              >
                {updateTypes.filter((type) => type.value !== "TODOS").map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <Field label="Titulo" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
            <Field label="Descricao" value={form.description} onChange={(value) => setForm({ ...form, description: value })} multiline />
            <Field label="Porcentagem da obra" value={form.progressPercent} onChange={(value) => setForm({ ...form, progressPercent: value })} placeholder="65" />
            <label className="surface-soft cursor-pointer rounded-2xl border-dashed p-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Camera size={17} />
                Upload de foto ou video do computador
              </span>
              <input className="sr-only" type="file" accept="image/*,video/*" onChange={handleMediaSelect} />
            </label>
            {form.mediaUrl && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <MediaPreview update={form} />
                <button
                  className="flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-black text-rose-600"
                  type="button"
                  onClick={removeSelectedMedia}
                >
                  <Trash2 size={16} />
                  Remover midia selecionada
                </button>
              </div>
            )}
            <button className="btn-primary px-4 py-3 font-bold disabled:opacity-60" disabled={isPublishing}>
              {isPublishing ? "Publicando..." : "Publicar na timeline"}
            </button>
          </form>
        )}

        <div className="grid gap-4">
          <div className="surface-soft grid gap-3 rounded-3xl p-3 md:grid-cols-[1fr_auto_auto]">
            <label className="input-shell flex items-center gap-2 rounded-2xl px-3 py-2">
              <Search size={17} />
              <input className="min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na timeline" />
            </label>
            <select className="input-shell rounded-2xl px-3 py-2 text-sm font-bold" value={filter} onChange={(event) => setFilter(event.target.value as WorkUpdateType | "TODOS")}>
              {updateTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <select className="input-shell rounded-2xl px-3 py-2 text-sm font-bold" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="recentes">Recentes</option>
              <option value="antigas">Antigas</option>
              <option value="fixados">Fixados primeiro</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <SlidersHorizontal size={15} />
            Realtime ativo via WebSocket da obra.
          </div>

          {filteredUpdates.map((update) => (
            <article className={`panel-flat overflow-hidden rounded-2xl ${update.pinned ? "ring-2 ring-teal-400/40" : ""}`} key={update.id}>
              <MediaPreview update={update} />
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">{typeLabels[update.type ?? "OBRA"]}</span>
                    {update.pinned && <span className="badge rounded-full px-3 py-1 text-xs font-black">Fixado</span>}
                    <span className="muted text-xs font-black uppercase">
                      {update.createdAt ? new Date(update.createdAt).toLocaleString("pt-BR") : "Sem data"}
                    </span>
                  </div>
                  <button className="icon-button p-2" type="button" title={update.pinned ? "Remover pin" : "Fixar"} onClick={() => handlePin(update)}>
                    <Pin size={16} />
                  </button>
                </div>
                <h3 className="font-black">{update.title}</h3>
                <p className="muted mt-2 text-sm leading-6">{update.description}</p>
                {update.progressPercent !== undefined && (
                  <p className="mt-3 inline-flex rounded-full bg-teal-500/10 px-3 py-1 text-xs font-black text-teal-700">
                    Obra em {update.progressPercent}%
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={() => handleLike(update.id)}>
                    <Heart size={16} />
                    {update.likesCount ?? 0}
                  </button>
                  <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={() => toggleComments(update.id)}>
                    <MessageCircle size={16} />
                    {update.commentsCount ?? comments[update.id]?.length ?? 0}
                  </button>
                </div>

                {openComments[update.id] && (
                  <div className="mt-4 grid gap-3">
                    {(comments[update.id] ?? []).map((comment) => (
                      <div className="surface-soft rounded-2xl p-3" key={comment.id}>
                        <p className="text-sm font-black">{comment.author?.fullName ?? "Colaborador"}</p>
                        <p className="muted mt-1 text-sm">{comment.message}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        className="input-shell min-w-0 flex-1 rounded-xl px-3 py-2"
                        value={commentDrafts[update.id] ?? ""}
                        onChange={(event) => setCommentDrafts({ ...commentDrafts, [update.id]: event.target.value })}
                        placeholder="Comentar"
                      />
                      <button className="btn-primary p-3" type="button" title="Enviar comentario" onClick={() => handleComment(update.id)}>
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
          {filteredUpdates.length === 0 && <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">Nenhuma atualizacao encontrada.</p>}
        </div>
      </div>
    </section>
  );
}

function MediaPreview({ update }: { update: Pick<WorkUpdate, "title" | "mediaUrl" | "mediaContentType" | "photoUrl" | "type"> }) {
  const mediaUrl = update.mediaUrl || update.photoUrl;
  if (!mediaUrl) return null;
  const isVideo = update.mediaContentType?.startsWith("video/") || update.type === "VIDEO" || /\.(mp4|webm|mov)$/i.test(mediaUrl);
  if (isVideo) {
    return (
      <div className="relative bg-black">
        <video className="max-h-[28rem] w-full object-contain" src={mediaUrl} controls preload="metadata" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-black text-white">
          <Video size={14} />
          Video
        </span>
      </div>
    );
  }
  if (update.type === "PROJETO") {
    return (
      <div className="surface-soft flex items-center gap-3 p-4">
        <FileText className="text-[var(--accent-strong)]" size={22} />
        <a className="font-bold underline" href={mediaUrl} target="_blank" rel="noreferrer">Abrir arquivo do projeto</a>
      </div>
    );
  }
  return <img className="max-h-[28rem] w-full object-cover" src={mediaUrl} alt={update.title} />;
}

function dateTime(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function uniqueById(updates: WorkUpdate[]) {
  return [...new Map(updates.map((update) => [update.id, update])).values()];
}
