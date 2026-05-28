import { Download, ImagePlus } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { EvolutionComparison } from "../../types";
import { fileToDataUrl } from "../../utils/files";

type BeforeAfterViewProps = {
  actorUserId: string;
  projectId?: string;
  canCreate: boolean;
};

export function BeforeAfterView({ actorUserId, projectId, canCreate }: BeforeAfterViewProps) {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<EvolutionComparison[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [position, setPosition] = useState(50);
  const [message, setMessage] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const beforeUrl = before || selected?.beforeUrl || "";
  const afterUrl = after || selected?.afterUrl || "";

  async function load() {
    if (!projectId) return;
    const loaded = await engflowApi.listEvolutionComparisons(projectId, actorUserId);
    setItems(loaded);
    setSelectedId((current) => current || loaded[0]?.id || "");
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar comparacoes.")));
  }, [projectId, actorUserId]);

  useEffect(() => {
    if (selected && !before && !after) setTitle(selected.title ?? "");
  }, [selected?.id]);

  async function selectImage(event: ChangeEvent<HTMLInputElement>, target: "before" | "after") {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (target === "before") setBefore(dataUrl);
    else setAfter(dataUrl);
  }

  function exportImage() {
    const link = document.createElement("a");
    link.href = afterUrl || beforeUrl;
    link.download = "evolucao-obra.png";
    link.click();
  }

  async function saveComparison() {
    if (!projectId || !before || !after) return;
    const saved = await engflowApi.saveEvolutionComparison(projectId, {
      actorUserId,
      beforeUrl: before,
      afterUrl: after,
      title: title || undefined,
    });
    setItems((current) => [saved, ...current]);
    setSelectedId(saved.id);
    setBefore("");
    setAfter("");
    setMessage("Comparacao salva.");
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Antes e depois</h2>
          <p className="muted mt-1">Comparacao visual da evolucao da obra com slider.</p>
        </div>
        <button className="btn-secondary flex w-fit items-center gap-2 px-4 py-3 font-bold" type="button" disabled={!beforeUrl && !afterUrl} onClick={exportImage}>
          <Download size={18} />
          Exportar
        </button>
      </div>
      {message && <p className="mb-4 rounded-xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}
      {canCreate && (
        <div className="surface-soft mb-4 grid gap-3 rounded-3xl p-4">
          <Field label="Titulo" value={title} onChange={setTitle} placeholder="Ex: Evolucao da fachada" />
          <div className="flex flex-wrap gap-2">
            <UploadButton label="Upload antes" onChange={(event) => selectImage(event, "before")} />
            <UploadButton label="Upload atual" onChange={(event) => selectImage(event, "after")} />
            <button className="btn-primary px-4 py-3 font-bold disabled:opacity-50" type="button" disabled={!before || !after} onClick={saveComparison}>
              Salvar comparacao
            </button>
          </div>
        </div>
      )}
      {items.length > 0 && (
        <select className="input-shell mb-4 rounded-2xl px-4 py-3 text-sm font-bold" value={selected?.id ?? ""} onChange={(event) => {
          setBefore("");
          setAfter("");
          setSelectedId(event.target.value);
        }}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.title || "Comparacao salva"} - {item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "sem data"}</option>
          ))}
        </select>
      )}
      <div ref={frameRef} className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)]">
        {beforeUrl && <img className="absolute inset-0 h-full w-full object-cover" src={beforeUrl} alt="Antes" />}
        {afterUrl && (
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
            <img className="h-full w-full object-cover" src={afterUrl} alt="Atual" />
          </div>
        )}
        {!beforeUrl && !afterUrl && <p className="muted grid h-full place-items-center px-4 text-center font-bold">Envie as imagens do computador para comparar.</p>}
        <input className="absolute bottom-4 left-4 right-4" type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} />
      </div>
    </section>
  );
}

function UploadButton({ label, onChange }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="btn-secondary flex cursor-pointer items-center gap-2 px-4 py-3 font-bold">
      <ImagePlus size={18} />
      {label}
      <input className="sr-only" type="file" accept="image/*" onChange={onChange} />
    </label>
  );
}
