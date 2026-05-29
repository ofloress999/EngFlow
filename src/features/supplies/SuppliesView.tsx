import { AlertTriangle, CheckCircle2, Download, PackageMinus, TrendingDown, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { SupplyRequest } from "../../types";

type SuppliesViewProps = {
  actorUserId: string;
  projectId?: string;
  canCreate?: boolean;
  canApprove?: boolean;
};

export function SuppliesView({ actorUserId, projectId, canCreate = true, canApprove = false }: SuppliesViewProps) {
  const [supplies, setSupplies] = useState<SupplyRequest[]>([]);
  const [form, setForm] = useState({ itemName: "", quantity: "", priority: "Media", observation: "" });
  const [message, setMessage] = useState<string | null>(null);
  const criticalItems = useMemo(
    () => supplies.filter((supply) => `${supply.observation ?? ""} ${supply.status}`.toLowerCase().includes("alta") || supply.status.includes("PENDENTE")),
    [supplies],
  );
  const predictedConsumption = useMemo(
    () => supplies.slice(0, 5).map((supply, index) => ({
      item: supply.itemName,
      risk: Math.max(22, 86 - index * 11),
      forecast: index < 2 ? "Comprar em ate 48h" : "Monitorar esta semana",
    })),
    [supplies],
  );

  async function load() {
    if (!projectId) return;
    setSupplies(await engflowApi.listSupplies(projectId, actorUserId));
  }

  useEffect(() => {
    load().catch(() => setMessage("Nao foi possivel carregar insumos."));
  }, [projectId, actorUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    try {
      await engflowApi.requestSupply(projectId, {
        actorUserId,
        itemName: form.itemName,
        quantity: form.quantity,
        observation: `${form.priority} prioridade${form.observation ? ` | ${form.observation}` : ""}`,
      });
      setForm({ itemName: "", quantity: "", priority: "Media", observation: "" });
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel relatar insumo."));
    }
  }

  async function handleApprove(supplyId: string) {
    try {
      const updated = await engflowApi.approveSupply(supplyId, actorUserId);
      setSupplies((current) => current.map((supply) => (supply.id === supplyId ? updated : supply)));
      setMessage("Pedido de insumo aprovado.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel aprovar o pedido."));
    }
  }

  async function handleDecline(supplyId: string) {
    try {
      const updated = await engflowApi.declineSupply(supplyId, actorUserId);
      setSupplies((current) => current.map((supply) => (supply.id === supplyId ? updated : supply)));
      setMessage("Pedido de insumo recusado.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel recusar o pedido."));
    }
  }

  function exportReport() {
    const report = [
      "Relatorio de materiais - EngFlow",
      "",
      ...supplies.map((supply) => `${supply.itemName}; ${supply.quantity}; ${supply.status}; ${supply.observation ?? ""}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-materiais.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!projectId) {
    return <EmptySupplies />;
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Insumos</h2>
          <p className="muted mt-1">Materiais, ferramentas e necessidades da obra.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge-accent inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-black">
            <AlertTriangle size={15} />
            {criticalItems.length} alerta{criticalItems.length === 1 ? "" : "s"}
          </span>
          <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={exportReport}>
            <Download size={16} />
            Relatorio
          </button>
        </div>
      </div>

      {message && <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm font-bold text-rose-500">{message}</p>}

      {canCreate && (
        <form className="surface-soft mt-5 grid gap-4 rounded-3xl p-4 xl:grid-cols-[1fr_170px_170px_1fr_auto]" onSubmit={handleSubmit}>
          <Field
            label="Material"
            value={form.itemName}
            onChange={(value) => setForm({ ...form, itemName: value })}
            placeholder="Cimento CP II"
          />
          <Field
            label="Quantidade"
            value={form.quantity}
            onChange={(value) => setForm({ ...form, quantity: value })}
            placeholder="20 sacos"
          />
          <label className="block">
            <span className="muted mb-2 block text-sm font-semibold">Prioridade</span>
            <select
              className="input-shell rounded-xl px-4 py-3"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              <option>Alta</option>
              <option>Media</option>
              <option>Baixa</option>
            </select>
          </label>
          <Field
            label="Observacao"
            value={form.observation}
            onChange={(value) => setForm({ ...form, observation: value })}
            placeholder="Compra urgente"
          />
          <button className="btn-primary mt-auto flex items-center justify-center gap-2 px-4 py-3 font-bold">
            <PackageMinus size={18} />
            Relatar
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        {supplies.map((supply) => (
          <article className="panel-flat rounded-2xl p-4" key={supply.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{supply.itemName}</h3>
                <p className="muted mt-1 text-sm">{supply.quantity}</p>
              </div>
              <span className="badge rounded-full px-3 py-1 text-xs font-black">{supply.status}</span>
            </div>
            {supply.observation && <p className="muted mt-3 text-sm">{supply.observation}</p>}
            {canApprove && supply.status === "PENDENTE_CLIENTE" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-primary flex items-center gap-2 px-3 py-2 text-sm font-bold"
                  type="button"
                  onClick={() => void handleApprove(supply.id)}
                >
                  <CheckCircle2 size={16} />
                  Aceitar pedido
                </button>
                <button
                  className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold text-rose-600"
                  type="button"
                  onClick={() => void handleDecline(supply.id)}
                >
                  <XCircle size={16} />
                  Negar pedido
                </button>
              </div>
            )}
          </article>
        ))}
        {supplies.length === 0 && <EmptyLine text="Nenhum insumo relatado." />}
      </div>

      <section className="surface-soft mt-6 rounded-3xl p-4">
        <div className="mb-4 flex items-center gap-2 font-black">
          <TrendingDown size={18} />
          Previsao de consumo
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {predictedConsumption.map((item) => (
            <div className="panel-flat rounded-2xl p-4" key={item.item}>
              <p className="font-black">{item.item}</p>
              <p className="muted mt-1 text-sm">{item.forecast}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <span className="block h-full rounded-full bg-teal-500" style={{ width: `${item.risk}%` }} />
              </div>
            </div>
          ))}
          {predictedConsumption.length === 0 && <EmptyLine text="Historico insuficiente para prever consumo." />}
        </div>
      </section>
    </section>
  );
}

function EmptySupplies() {
  return (
    <section className="panel rounded-[2rem] p-6">
      <h2 className="text-2xl font-black">Insumos</h2>
      <p className="muted mt-2">Selecione uma obra para visualizar solicitacoes.</p>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="surface-soft rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">{text}</p>;
}
