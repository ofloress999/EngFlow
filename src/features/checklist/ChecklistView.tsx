import { Camera, CheckCircle2, PenLine, Plus, Save, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field, ProgressBar, Stat } from "../../components";
import type { ChecklistItem } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { connectProjectRealtime } from "../../utils/realtime";

type ChecklistViewProps = {
  actorUserId: string;
  projectId?: string;
  canPlan: boolean;
  canConfirm: boolean;
};

export function ChecklistView({ actorUserId, projectId, canPlan, canConfirm }: ChecklistViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<ChecklistItem>>>({});
  const [newItem, setNewItem] = useState({
    stage: new Date().toISOString().slice(0, 10),
    title: "",
    comment: "",
    signature: "",
    photoUrl: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const sortedItems = [...items].sort((first, second) => first.stage.localeCompare(second.stage) || first.title.localeCompare(second.title));
  const approved = sortedItems.filter((item) => item.approved).length;
  const progress = sortedItems.length ? Math.round((approved / sortedItems.length) * 100) : 0;

  async function load() {
    if (!projectId) return;
    setItems(await engflowApi.listChecklist(projectId, actorUserId));
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar checklist.")));
  }, [projectId, actorUserId]);

  useEffect(() => {
    if (!projectId) return;
    return connectProjectRealtime(projectId, (event) => {
      if (event.type === "CHECKLIST_UPDATED") load().catch(() => undefined);
    });
  }, [projectId, actorUserId]);

  async function handlePhoto(item: ChecklistItem, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraft(item.id, { photoUrl: await fileToDataUrl(file) });
  }

  async function handleNewPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setNewItem({ ...newItem, photoUrl: await fileToDataUrl(file) });
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !canPlan || !newItem.title.trim()) return;
    const saved = await engflowApi.saveChecklistItem(projectId, undefined, {
      actorUserId,
      stage: newItem.stage,
      title: newItem.title,
      approved: false,
      photoUrl: newItem.photoUrl || undefined,
      comment: newItem.comment || undefined,
      signature: newItem.signature || undefined,
    });
    setItems((current) => [...current, saved]);
    setNewItem({ stage: new Date().toISOString().slice(0, 10), title: "", comment: "", signature: "", photoUrl: "" });
    setMessage("Tarefa adicionada ao checklist.");
  }

  async function deleteItem(itemId: string) {
    if (!projectId || !canPlan) return;
    await engflowApi.deleteChecklistItem(projectId, itemId, actorUserId);
    setItems((current) => current.filter((item) => item.id !== itemId));
    setMessage("Tarefa removida do checklist.");
  }

  async function save(item: ChecklistItem, approved?: boolean) {
    if (!projectId || (!canPlan && !canConfirm)) return;
    const draft = drafts[item.id] ?? {};
    const saved = await engflowApi.saveChecklistItem(projectId, item.id, {
      actorUserId,
      stage: draft.stage ?? item.stage,
      title: draft.title ?? item.title,
      approved: approved ?? draft.approved ?? item.approved,
      photoUrl: draft.photoUrl ?? item.photoUrl,
      comment: draft.comment ?? item.comment,
      signature: draft.signature ?? item.signature,
    });
    setItems((current) => [...current.filter((entry) => entry.id !== item.id && entry.id !== saved.id), saved]);
    setMessage("Checklist salvo.");
  }

  function setDraft(itemId: string, patch: Partial<ChecklistItem>) {
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  }

  if (!projectId) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Checklist de etapas</h2>
        <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Checklist de etapas</h2>
          <p className="muted mt-1">O responsavel tecnico define as tarefas do dia e o pedreiro confirma a execucao.</p>
        </div>
        <span className="badge-accent rounded-full px-3 py-1 text-sm font-black">{progress}% aprovado</span>
      </div>
      {message && <p className="mb-4 rounded-xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_10rem_10rem]">
        <div className="surface-soft rounded-2xl p-4"><ProgressBar value={progress} /></div>
        <Stat title="Aprovados" value={String(approved)} />
        <Stat title="Pendentes" value={String(sortedItems.length - approved)} />
      </div>
      {canPlan && (
        <form className="surface-soft mb-5 grid gap-3 rounded-3xl p-4" onSubmit={createItem}>
          <div className="flex items-center gap-2 font-black">
            <Plus size={18} />
            Planejar tarefa do dia
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Data ou etapa" value={newItem.stage} onChange={(value) => setNewItem({ ...newItem, stage: value })} />
            <Field label="Tarefa do dia" value={newItem.title} onChange={(value) => setNewItem({ ...newItem, title: value })} placeholder="Ex: Concretar laje do pavimento 1" />
          </div>
          <Field label="Orientacao tecnica" value={newItem.comment} onChange={(value) => setNewItem({ ...newItem, comment: value })} placeholder="Detalhes, criterios de aceite ou observacoes" multiline />
          <div className="flex flex-wrap gap-2">
            <Field label="Responsavel tecnico" value={newItem.signature} onChange={(value) => setNewItem({ ...newItem, signature: value })} placeholder="Nome do engenheiro/arquiteto" />
            <label className="btn-secondary flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-bold">
              <Camera size={16} />
              Anexar referencia
              <input className="sr-only" type="file" accept="image/*" onChange={handleNewPhoto} />
            </label>
          </div>
          {newItem.photoUrl && <img className="max-h-52 w-full rounded-2xl object-cover" src={newItem.photoUrl} alt="Referencia da tarefa" />}
          <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-50" disabled={!newItem.title.trim()}>
            <Save size={18} />
            Adicionar tarefa
          </button>
        </form>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {sortedItems.map((item) => {
          const draft = drafts[item.id] ?? {};
          const photoUrl = draft.photoUrl ?? item.photoUrl;
          return (
            <article className="panel-flat rounded-2xl p-4" key={item.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="badge-accent rounded-full px-3 py-1 text-xs font-black">{item.stage}</span>
                  <h3 className="mt-2 font-black">{item.title}</h3>
                </div>
                <div className="flex gap-2">
                  {(canPlan || canConfirm) && (
                    <button className={`icon-button p-2 ${item.approved ? "active" : ""}`} type="button" title="Concluir tarefa" onClick={() => save(item, !item.approved)}>
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  {canPlan && (
                    <button className="icon-button p-2" type="button" title="Excluir tarefa" onClick={() => deleteItem(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              {photoUrl && <img className="mb-3 max-h-64 w-full rounded-2xl object-cover" src={photoUrl} alt={item.title} />}
              {(canPlan || canConfirm) && (
                <div className="grid gap-3">
                  {canPlan && (
                    <>
                      <Field label="Tarefa" value={String(draft.title ?? item.title ?? "")} onChange={(value) => setDraft(item.id, { title: value })} />
                      <Field label="Comentario" value={String(draft.comment ?? item.comment ?? "")} onChange={(value) => setDraft(item.id, { comment: value })} />
                      <Field label="Assinatura" value={String(draft.signature ?? item.signature ?? "")} onChange={(value) => setDraft(item.id, { signature: value })} placeholder="Nome do responsavel" />
                    </>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="btn-secondary flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-bold">
                      <Camera size={16} />
                      Foto do computador
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handlePhoto(item, event)} />
                    </label>
                    {canPlan && (
                      <button className="btn-primary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={() => save(item)}>
                        <Save size={16} />
                        Salvar
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!canPlan && item.signature && <p className="muted mt-3 flex items-center gap-2 text-sm"><PenLine size={15} />{item.signature}</p>}
            </article>
          );
        })}
        {sortedItems.length === 0 && (
          <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">
            Nenhuma tarefa planejada ainda. O engenheiro ou arquiteto deve adicionar o que precisa ser feito.
          </p>
        )}
      </div>
    </section>
  );
}
