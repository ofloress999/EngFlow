import { Calculator, HelpCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Stat } from "../../components";
import type { PricingEstimate } from "../../types";
import { money } from "../../utils/format";

type PricingViewProps = {
  actorUserId: string;
  projectId?: string;
};

const pricingHelp = {
  areaM2: "Area total considerada no orcamento. Multiplica o valor por m2 para formar o custo base.",
  pricePerM2: "Valor unitario por metro quadrado antes dos percentuais.",
  complexityPercent: "Percentual adicional por dificuldade tecnica, prazo, terreno, risco ou acabamento.",
  marginPercent: "Percentual comercial aplicado sobre o custo base junto da complexidade.",
};

export function PricingView({ actorUserId, projectId }: PricingViewProps) {
  const [items, setItems] = useState<PricingEstimate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    areaM2: "",
    pricePerM2: "",
    complexityPercent: "",
    marginPercent: "",
  });
  const latest = items[0];
  const preview = useMemo(
    () =>
      calculateSuggested(
        Number(form.areaM2),
        Number(form.pricePerM2),
        Number(form.complexityPercent),
        Number(form.marginPercent),
      ),
    [form],
  );

  async function load() {
    if (!projectId) return;
    setItems(await engflowApi.listPricing(projectId, actorUserId));
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar precificacoes.")));
  }, [projectId, actorUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const payload = {
      actorUserId,
      areaM2: Number(form.areaM2),
      pricePerM2: Number(form.pricePerM2),
      complexityPercent: Number(form.complexityPercent),
      marginPercent: Number(form.marginPercent),
    };

    try {
      if (editingId) {
        await engflowApi.updatePricing(projectId, editingId, payload);
        setMessage("Orcamento atualizado.");
      } else {
        await engflowApi.createPricing(projectId, payload);
        setMessage("Orcamento salvo.");
      }
      clearForm();
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar o orcamento."));
    }
  }

  async function handleDelete(itemId: string) {
    if (!projectId) return;
    try {
      await engflowApi.deletePricing(projectId, itemId, actorUserId);
      if (editingId === itemId) clearForm();
      setMessage("Orcamento excluido.");
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir o orcamento."));
    }
  }

  function startEdit(item: PricingEstimate) {
    setEditingId(item.id);
    setForm({
      areaM2: String(item.areaM2),
      pricePerM2: String(item.pricePerM2),
      complexityPercent: String(item.complexityPercent),
      marginPercent: String(item.marginPercent),
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm({ areaM2: "", pricePerM2: "", complexityPercent: "", marginPercent: "" });
  }

  if (!projectId) {
    return <EmptyPricing />;
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
            Orcamento
          </p>
          <h2 className="text-3xl font-black tracking-tight">Precificacao</h2>
          <p className="muted mt-2">Salve, altere e exclua orcamentos vinculados a obra selecionada.</p>
        </div>
        <Calculator className="subtle" size={32} />
      </div>

      {message && <p className="mb-4 rounded-2xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}

      <form className="surface-soft grid gap-4 rounded-3xl p-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
        <HelpField
          label="Area m2"
          help={pricingHelp.areaM2}
          value={form.areaM2}
          onChange={(value) => setForm({ ...form, areaM2: value })}
        />
        <HelpField
          label="Valor por m2"
          help={pricingHelp.pricePerM2}
          value={form.pricePerM2}
          onChange={(value) => setForm({ ...form, pricePerM2: value })}
        />
        <HelpField
          label="Complexidade %"
          help={pricingHelp.complexityPercent}
          value={form.complexityPercent}
          onChange={(value) => setForm({ ...form, complexityPercent: value })}
        />
        <HelpField
          label="Margem %"
          help={pricingHelp.marginPercent}
          value={form.marginPercent}
          onChange={(value) => setForm({ ...form, marginPercent: value })}
        />
        <div className="xl:col-span-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <p className="muted text-sm font-semibold">
            Calculo: area x valor por m2 x (1 + complexidade/100 + margem/100). Previa:{" "}
            <span className="font-black text-[var(--text)]">{money(preview)}</span>
          </p>
          {editingId && (
            <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold" type="button" onClick={clearForm}>
              <X size={18} />
              Cancelar
            </button>
          )}
          <button className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold">
            <Save size={18} />
            {editingId ? "Atualizar orcamento" : "Salvar orcamento"}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat title="Ultima area" value={latest ? `${latest.areaM2} m2` : "Sem dados"} />
        <Stat title="Valor por m2" value={latest ? money(latest.pricePerM2) : "Sem dados"} />
        <Stat title="Valor sugerido" value={latest ? money(latest.suggestedAmount) : "Sem dados"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="surface-soft rounded-3xl p-5">
          <h3 className="mb-4 font-black">Legenda da precificacao</h3>
          <div className="grid gap-3 text-sm">
            <LegendLine label="Area m2" value={pricingHelp.areaM2} />
            <LegendLine label="Valor por m2" value={pricingHelp.pricePerM2} />
            <LegendLine label="Complexidade %" value={pricingHelp.complexityPercent} />
            <LegendLine label="Margem %" value={pricingHelp.marginPercent} />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                {["Area", "M2", "Complex.", "Margem", "Sugerido", ""].map((head) => (
                  <th className="border-b border-[var(--border)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)]" key={head}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-[var(--border)] px-4 py-3 font-bold">{item.areaM2} m2</td>
                  <td className="border-b border-[var(--border)] px-4 py-3">{money(item.pricePerM2)}</td>
                  <td className="border-b border-[var(--border)] px-4 py-3">{item.complexityPercent}%</td>
                  <td className="border-b border-[var(--border)] px-4 py-3">{item.marginPercent}%</td>
                  <td className="border-b border-[var(--border)] px-4 py-3 font-black">{money(item.suggestedAmount)}</td>
                  <td className="border-b border-[var(--border)] px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button className="icon-button p-2" title="Editar orcamento" type="button" onClick={() => startEdit(item)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button p-2" title="Excluir orcamento" type="button" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="surface-soft mt-3 rounded-2xl p-4 text-sm font-semibold text-[var(--muted)]">
              Nenhum orcamento salvo.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function HelpField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="muted text-sm font-semibold">{label}</span>
        <span className="inline-flex" title={help}>
          <HelpCircle className="text-[var(--accent-strong)]" size={16} />
        </span>
      </div>
      <input
        className="input-shell rounded-xl px-4 py-3"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function LegendLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-flat rounded-2xl p-3">
      <p className="font-black">{label}</p>
      <p className="muted mt-1 leading-6">{value}</p>
    </div>
  );
}

function calculateSuggested(area: number, price: number, complexity: number, margin: number) {
  const base = (area || 0) * (price || 0);
  return base * (1 + (complexity || 0) / 100 + (margin || 0) / 100);
}

function EmptyPricing() {
  return (
    <section className="panel rounded-[2rem] p-6">
      <h2 className="text-2xl font-black">Precificacao</h2>
      <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
    </section>
  );
}
