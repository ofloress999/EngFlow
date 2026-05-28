import { BarChart3, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import type { SheetEntry } from "../../types";
import { money } from "../../utils/format";

type SheetsViewProps = {
  actorUserId: string;
  projectId?: string;
};

type DraftRow = {
  id: string;
  item: string;
  category: string;
  amount: string;
  formula: string;
  status: string;
  isNew?: boolean;
};

const categories = ["CUSTO", "GASTO", "PROJETO_A_FAZER", "DOCUMENTACAO_A_ENTREGAR"];

export function SheetsView({ actorUserId, projectId }: SheetsViewProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const computedRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        computedAmount: evaluateFormula(row.formula, rows, index) ?? numericValue(row.amount),
      })),
    [rows],
  );
  const total = computedRows.reduce((sum, row) => sum + row.computedAmount, 0);
  const categoryTotals = categories.map((category) => ({
    category,
    total: computedRows
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + row.computedAmount, 0),
  }));
  const maxCategoryTotal = Math.max(1, ...categoryTotals.map((item) => item.total));

  async function load() {
    if (!projectId) return;
    const loadedRows = await engflowApi.listSheetEntries(projectId, actorUserId);
    setRows(loadedRows.map(toDraftRow));
    setMessage(null);
  }

  useEffect(() => {
    load().catch((error) => setMessage(getApiErrorMessage(error, "Nao foi possivel carregar a planilha.")));
  }, [projectId, actorUserId]);

  function updateRow(rowId: string, changes: Partial<DraftRow>) {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...changes } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        item: "",
        category: "CUSTO",
        amount: "0",
        formula: "",
        status: "Pendente",
        isNew: true,
      },
    ]);
  }

  async function deleteRow(row: DraftRow) {
    if (!projectId) return;
    if (row.isNew) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }

    try {
      await engflowApi.deleteSheetEntry(projectId, row.id, actorUserId);
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a linha."));
    }
  }

  async function saveRows() {
    if (!projectId) return;
    setIsSaving(true);
    setMessage(null);
    try {
      for (const row of computedRows) {
        const payload = {
          actorUserId,
          item: row.item || "Sem titulo",
          category: row.category,
          amount: row.computedAmount,
          formula: row.formula || undefined,
          status: row.status || "Pendente",
        };

        if (row.isNew) {
          await engflowApi.addSheetEntry(projectId, payload);
        } else {
          await engflowApi.updateSheetEntry(projectId, row.id, payload);
        }
      }
      setMessage("Planilha salva.");
      await load();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a planilha."));
    } finally {
      setIsSaving(false);
    }
  }

  if (!projectId) {
    return (
      <section className="panel rounded-[2rem] p-6">
        <h2 className="text-2xl font-black">Planilhas</h2>
        <p className="muted mt-2">Selecione uma obra para carregar dados.</p>
      </section>
    );
  }

  return (
    <section className="panel rounded-[2rem] p-5">
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
            Spreadsheet
          </p>
          <h2 className="text-3xl font-black tracking-tight">Planilhas e graficos</h2>
          <p className="muted mt-2">Edite celulas, use formulas simples, salve alteracoes e exclua linhas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary flex items-center gap-2 px-4 py-3 font-bold" type="button" onClick={addRow}>
            <Plus size={18} />
            Linha
          </button>
          <button
            className="btn-primary flex items-center gap-2 px-4 py-3 font-bold disabled:opacity-60"
            type="button"
            onClick={saveRows}
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? "Salvando" : "Salvar planilha"}
          </button>
        </div>
      </div>

      {message && <p className="mb-4 rounded-2xl bg-teal-500/10 p-3 text-sm font-semibold text-teal-700">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.36fr]">
        <div className="overflow-x-auto rounded-3xl border border-[var(--border)] scrollbar-soft">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                {["A Item", "B Categoria", "C Formula", "D Valor", "E Status", ""].map((head) => (
                  <th className="border-b border-r border-[var(--border)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)]" key={head}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="border-b border-r border-[var(--border)] p-0">
                    <input
                      className="sheet-cell"
                      value={row.item}
                      onChange={(event) => updateRow(row.id, { item: event.target.value })}
                      placeholder={`Linha ${index + 1}`}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--border)] p-0">
                    <select
                      className="sheet-cell"
                      value={row.category}
                      onChange={(event) => updateRow(row.id, { category: event.target.value })}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-r border-[var(--border)] p-0">
                    <input
                      className="sheet-cell font-mono text-xs"
                      value={row.formula}
                      onChange={(event) => updateRow(row.id, { formula: event.target.value })}
                      placeholder={`=D${index + 1}*1.1`}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--border)] p-0">
                    <input
                      className="sheet-cell font-black"
                      value={row.formula ? String(row.computedAmount) : row.amount}
                      onChange={(event) => updateRow(row.id, { amount: event.target.value, formula: "" })}
                      inputMode="decimal"
                    />
                  </td>
                  <td className="border-b border-r border-[var(--border)] p-0">
                    <input
                      className="sheet-cell"
                      value={row.status}
                      onChange={(event) => updateRow(row.id, { status: event.target.value })}
                      placeholder="Pendente"
                    />
                  </td>
                  <td className="w-14 border-b border-[var(--border)] px-2 py-2 text-center">
                    <button className="icon-button p-2" title="Excluir linha" type="button" onClick={() => deleteRow(row)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-5">
              <p className="text-sm font-semibold text-[var(--muted)]">Nenhuma linha cadastrada.</p>
              <button className="btn-secondary mt-3 flex items-center gap-2 px-3 py-2 text-sm font-bold" type="button" onClick={addRow}>
                <Plus size={16} />
                Criar primeira linha
              </button>
            </div>
          )}
        </div>

        <div className="surface-soft rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black">Grafico rapido</h3>
              <p className="muted mt-1 text-sm">Total: {money(total)}</p>
            </div>
            <BarChart3 className="subtle" size={24} />
          </div>
          <div className="grid gap-3">
            {categoryTotals.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex justify-between gap-2 text-xs font-black">
                  <span>{item.category}</span>
                  <span>{money(item.total)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--surface)]">
                  <span
                    className="block h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(4, (item.total / maxCategoryTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function toDraftRow(row: SheetEntry): DraftRow {
  return {
    id: row.id,
    item: row.item,
    category: row.category,
    amount: String(Number(row.amount ?? 0)),
    formula: row.formula ?? "",
    status: row.status,
  };
}

function numericValue(value: string) {
  return Number(String(value).replace(",", ".")) || 0;
}

function evaluateFormula(formula: string, rows: DraftRow[], currentIndex: number) {
  const normalized = formula.trim();
  if (!normalized.startsWith("=")) return null;

  const expression = normalized
    .slice(1)
    .replace(/SOMA\((D\d+):D(\d+)\)/gi, (_, start: string, end: string) => {
      const first = Number(start.slice(1)) - 1;
      const last = Number(end) - 1;
      return String(sumRange(rows, first, last));
    })
    .replace(/SUM\((D\d+):D(\d+)\)/gi, (_, start: string, end: string) => {
      const first = Number(start.slice(1)) - 1;
      const last = Number(end) - 1;
      return String(sumRange(rows, first, last));
    })
    .replace(/D(\d+)/gi, (_, rowNumber: string) => {
      const referencedIndex = Number(rowNumber) - 1;
      if (referencedIndex === currentIndex) return String(numericValue(rows[currentIndex]?.amount ?? "0"));
      return String(numericValue(rows[referencedIndex]?.amount ?? "0"));
    })
    .replace(/,/g, ".");

  if (!/^[\d+\-*/().\s]+$/.test(expression)) return 0;

  try {
    return Number(Function(`"use strict"; return (${expression})`)()) || 0;
  } catch {
    return 0;
  }
}

function sumRange(rows: DraftRow[], first: number, last: number) {
  const start = Math.max(0, Math.min(first, last));
  const end = Math.min(rows.length - 1, Math.max(first, last));
  return rows.slice(start, end + 1).reduce((sum, row) => sum + numericValue(row.amount), 0);
}
