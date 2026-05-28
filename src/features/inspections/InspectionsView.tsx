import { CalendarDays, Paperclip, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { Inspection, Project } from "../../types";
import { fileToDataUrl } from "../../utils/files";

type InspectionsViewProps = {
  actorUserId: string;
  projects: Project[];
  selectedProjectId?: string;
};

type InspectionForm = {
  title: string;
  scheduledFor: string;
  location: string;
  notes: string;
  attachmentName: string;
  attachmentUrl: string;
  contentType: string;
};

type DisplayInspection = Inspection & {
  projectId: string;
  projectName: string;
  projectAddress: string;
};

const emptyForm: InspectionForm = {
  title: "",
  scheduledFor: "",
  location: "",
  notes: "",
  attachmentName: "",
  attachmentUrl: "",
  contentType: "",
};

export function InspectionsView({ actorUserId, projects, selectedProjectId }: InspectionsViewProps) {
  const [activeProjectId, setActiveProjectId] = useState(selectedProjectId ?? projects[0]?.id ?? "");
  const [inspections, setInspections] = useState<DisplayInspection[]>([]);
  const [form, setForm] = useState<InspectionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    const now = new Date();
    return inspections.filter((inspection) => new Date(inspection.scheduledFor) >= now);
  }, [inspections]);

  useEffect(() => {
    if (selectedProjectId) {
      setActiveProjectId(selectedProjectId);
    } else if (!activeProjectId && projects[0]) {
      setActiveProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects, activeProjectId]);

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar vistorias.")));
  }, [actorUserId, projects.length]);

  async function load() {
    if (projects.length === 0) return;
    const loaded = await Promise.all(
      projects.map(async (project) =>
        (await engflowApi.listInspections(project.id, actorUserId)).map((inspection) => ({
          ...inspection,
          projectId: project.id,
          projectName: project.name,
          projectAddress: project.address,
        })),
      ),
    );
    setInspections(
      loaded
        .flat()
        .sort((first, second) => new Date(first.scheduledFor).getTime() - new Date(second.scheduledFor).getTime()),
    );
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProjectId) return;
    const payload = {
      actorUserId,
      title: form.title,
      scheduledFor: form.scheduledFor,
      location: form.location || undefined,
      notes: form.notes || undefined,
      attachmentName: form.attachmentName || undefined,
      attachmentUrl: form.attachmentUrl || undefined,
      contentType: form.contentType || undefined,
    };

    try {
      if (editingId) {
        await engflowApi.updateInspection(activeProjectId, editingId, payload);
        setMessage("Vistoria atualizada.");
      } else {
        await engflowApi.createInspection(activeProjectId, payload);
        setMessage("Vistoria agendada.");
      }
      clearForm();
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a vistoria."));
    }
  }

  async function handleDelete(inspectionId: string) {
    const inspection = inspections.find((item) => item.id === inspectionId);
    const targetProjectId = inspection?.projectId ?? activeProjectId;
    if (!targetProjectId) return;
    try {
      await engflowApi.deleteInspection(targetProjectId, inspectionId, actorUserId);
      if (editingId === inspectionId) clearForm();
      setMessage("Vistoria excluida.");
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a vistoria."));
    }
  }

  async function handleAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm({
      ...form,
      attachmentName: file.name,
      attachmentUrl: await fileToDataUrl(file),
      contentType: file.type,
    });
  }

  function startEdit(inspection: DisplayInspection) {
    setEditingId(inspection.id);
    setActiveProjectId(inspection.projectId);
    setForm({
      title: inspection.title,
      scheduledFor: inspection.scheduledFor.slice(0, 16),
      location: inspection.location ?? "",
      notes: inspection.notes ?? "",
      attachmentName: inspection.attachmentName ?? "",
      attachmentUrl: inspection.attachmentUrl ?? "",
      contentType: inspection.contentType ?? "",
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  if (projects.length === 0) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Vistorias</h2>
        <p className="muted mt-2">Crie ou selecione uma obra para agendar vistorias.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
            Calendario
          </p>
          <h2 className="text-3xl font-black tracking-tight">Vistorias</h2>
          <p className="muted mt-2">Agende proximas vistorias, vincule a obra e anexe documentos do computador.</p>
        </div>
        <span className="badge-accent flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-black">
          <CalendarDays size={16} />
          {upcoming.length} futura{upcoming.length === 1 ? "" : "s"}
        </span>
      </div>

      {message && <p className="mb-4 rounded-2xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[0.52fr_1fr]">
        <form className="surface-soft grid gap-3 rounded-2xl p-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 font-black">
            <Plus size={18} />
            {editingId ? "Editar vistoria" : "Nova vistoria"}
          </div>
          <label className="block">
            <span className="muted mb-2 block text-sm font-semibold">Obra</span>
            <select
              className="input-shell rounded-xl px-4 py-3"
              value={activeProjectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Titulo" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <label className="block">
            <span className="muted mb-2 block text-sm font-semibold">Data e hora</span>
            <input
              className="input-shell rounded-xl px-4 py-3"
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })}
            />
          </label>
          <Field label="Local" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
          <Field label="Observacoes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} multiline />
          <label className="surface-soft cursor-pointer rounded-2xl border-dashed p-4 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Paperclip size={17} />
              {form.attachmentName || "Anexar documento da vistoria"}
            </span>
            <input className="sr-only" type="file" onChange={handleAttachment} />
          </label>
          <div className="flex flex-wrap gap-2">
            {editingId && (
              <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" type="button" onClick={clearForm}>
                <X size={18} />
                Cancelar
              </button>
            )}
            <button className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-3 font-bold">
              <Save size={18} />
              {editingId ? "Atualizar" : "Agendar"}
            </button>
          </div>
        </form>

        <div className="grid gap-4 content-start">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black">Proximas vistorias</h3>
              <p className="muted mt-1 text-sm">Agenda integrada pelas datas cadastradas.</p>
            </div>
            <div className="panel-flat flex w-fit items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold">
              <CalendarDays size={16} />
              Calendario
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((inspection) => (
            <article className="panel-flat rounded-2xl p-4" key={inspection.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[var(--accent-strong)]">
                    {new Date(inspection.scheduledFor).toLocaleDateString("pt-BR")}
                  </p>
                  <h3 className="mt-1 font-black">{inspection.title}</h3>
                  <p className="muted mt-1 text-sm">{new Date(inspection.scheduledFor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex gap-2">
                  <button className="icon-button p-2" title="Editar vistoria" type="button" onClick={() => startEdit(inspection)}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-button p-2" title="Excluir vistoria" type="button" onClick={() => handleDelete(inspection.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm font-black">{inspection.projectName}</p>
              <p className="muted mt-1 line-clamp-2 text-sm">{inspection.location || inspection.projectAddress}</p>
              {inspection.notes && <p className="muted mt-3 text-sm leading-6">{inspection.notes}</p>}
              {inspection.attachmentUrl && (
                <a
                  className="badge mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black"
                  href={inspection.attachmentUrl}
                  download={inspection.attachmentName}
                >
                  <Paperclip size={14} />
                  {inspection.attachmentName ?? "Anexo"}
                </a>
              )}
              <a
                className="badge mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black"
                href={calendarFileUrl(inspection)}
                download={`${inspection.title || "vistoria"}.ics`}
              >
                <CalendarDays size={14} />
                Calendario
              </a>
            </article>
          ))}
          </div>
          {upcoming.length === 0 && (
            <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">
              Nenhuma vistoria futura agendada.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function calendarFileUrl(inspection: DisplayInspection) {
  const start = new Date(inspection.scheduledFor);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${inspection.id}@engflow`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(inspection.title)}`,
    `LOCATION:${escapeIcs(inspection.location || inspection.projectAddress)}`,
    `DESCRIPTION:${escapeIcs(`${inspection.projectName}\n${inspection.notes ?? ""}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
