import { ArrowLeft, CheckCircle2, ImagePlus, Search, Send, UserPlus, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { engflowApi } from "../../api/engflowApi";
import { Field } from "../../components";
import { roleLabels } from "../../constants/labels";
import type { Role, User } from "../../types";
import { fileToDataUrl } from "../../utils/files";
import { cleanCpf, formatCpf, isValidCpf } from "../../utils/format";

type NewProjectViewProps = {
  actorUserId: string;
  onBack: () => void;
  onCreateProject: (payload: {
    name: string;
    address: string;
    photoUrl?: string;
    startDate?: string;
    expectedEndDate?: string;
  }) => Promise<void>;
};

export function NewProjectView({ actorUserId, onBack, onCreateProject }: NewProjectViewProps) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    photoUrl: "",
    client: "",
    startDate: "",
    expectedEndDate: "",
  });
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState<Role>("cliente");
  const [found, setFound] = useState<User | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateProject({
      name: form.name,
      address: form.address,
      photoUrl: form.photoUrl || undefined,
      startDate: form.startDate || undefined,
      expectedEndDate: form.expectedEndDate || undefined,
    });
  }

  async function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const photoUrl = await fileToDataUrl(file);
    setForm((current) => ({ ...current, photoUrl }));
  }

  async function handleFindCpf() {
    setFound(null);
    setSearchMessage(null);
    try {
      if (!isValidCpf(cpf)) {
        setSearchMessage("CPF invalido.");
        return;
      }
      const user = await engflowApi.findUserByCpf(cleanCpf(cpf));
      setFound(user);
      setSearchMessage(`${user.name} encontrado como ${roleLabels[user.role]}.`);
      if (user.role === "cliente") {
        setForm((current) => ({ ...current, client: user.name }));
      }
    } catch {
      setSearchMessage(`Cadastro nao encontrado. Um convite podera ser enviado para CPF ${formatCpf(cpf) || "novo"}.`);
    }
  }

  return (
    <div className="space-y-6">
      <button className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold" onClick={onBack}>
        <ArrowLeft size={17} />
        Voltar para obras
      </button>

      <section className="panel rounded-[2rem] p-5 sm:p-6">
        <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
          Nova operacao
        </p>
        <h2 className="text-3xl font-black tracking-tight">Criar nova obra</h2>
        <p className="muted mt-2 max-w-2xl">
          Cadastre a obra, vincule cliente por CPF e prepare a equipe para receber convites.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
        <form className="panel rounded-[2rem] p-5" onSubmit={handleSubmit}>
          <h3 className="text-xl font-black">Dados principais</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="surface-soft overflow-hidden rounded-3xl border-dashed">
                {form.photoUrl ? (
                  <div className="relative">
                    <img className="h-52 w-full object-cover" src={form.photoUrl} alt="Foto da obra" />
                    <button
                      className="icon-button absolute right-3 top-3 p-2"
                      type="button"
                      title="Remover foto"
                      onClick={() => setForm({ ...form, photoUrl: "" })}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center px-5 py-8 text-center">
                    <ImagePlus className="text-[var(--accent-strong)]" size={30} />
                    <span className="mt-3 font-black">Adicionar foto da obra</span>
                    <span className="muted mt-1 text-sm">Selecione uma imagem do computador.</span>
                    <input className="sr-only" type="file" accept="image/*" onChange={handlePhotoSelect} />
                  </label>
                )}
              </div>
            </div>
            <Field
              label="Nome da obra"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              placeholder="Residencial Jardim Sul"
            />
            <Field
              label="Endereco da obra"
              value={form.address}
              onChange={(value) => setForm({ ...form, address: value })}
              placeholder="Rua, numero, bairro"
            />
            <Field
              label="Cliente"
              value={form.client}
              onChange={(value) => setForm({ ...form, client: value })}
              placeholder="Busque por CPF ao lado"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Data de inicio"
                type="date"
                value={form.startDate}
                onChange={(value) => setForm({ ...form, startDate: value })}
              />
              <Field
                label="Previsao final"
                type="date"
                value={form.expectedEndDate}
                onChange={(value) => setForm({ ...form, expectedEndDate: value })}
              />
            </div>
          </div>
          <button className="btn-primary mt-5 flex items-center gap-2 px-4 py-3 font-bold">
            <CheckCircle2 size={18} />
            Criar obra
          </button>
        </form>

        <section className="panel rounded-[2rem] p-5">
          <h3 className="text-xl font-black">Vincular pessoas</h3>
          <p className="muted mt-1 text-sm">Busque por CPF e selecione a funcao para preparar o convite.</p>
          <div className="mt-5 grid gap-3">
            <Field
              label="CPF"
              value={cpf}
              onChange={(value) => setCpf(formatCpf(value))}
              placeholder="000.000.000-00"
            />
            <label className="block">
              <span className="muted mb-2 block text-sm font-semibold">Funcao</span>
              <select
                className="input-shell rounded-xl px-4 py-3"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="cliente">Cliente</option>
                <option value="pedreiro">Pedreiro</option>
                <option value="arquiteto">Arquiteto</option>
                <option value="engenheiro">Engenheiro</option>
              </select>
            </label>
            <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 font-bold" type="button" onClick={handleFindCpf}>
              <Search size={18} />
              Buscar CPF
            </button>

            {searchMessage && <p className="surface-soft rounded-2xl p-3 text-sm font-semibold">{searchMessage}</p>}
            {found && (
              <div className="panel-flat rounded-2xl p-4">
                <p className="font-black">{found.name}</p>
                <p className="muted mt-1 text-sm">{roleLabels[found.role]} | {found.email}</p>
                <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2 px-4 py-3 font-bold" type="button">
                  <Send size={17} />
                  Preparar convite
                </button>
              </div>
            )}
            <div className="surface-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 font-black">
                <UserPlus size={18} />
                Equipe prevista
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Engenheiros", "Arquitetos", "Pedreiros", "Clientes"].map((item) => (
                  <span className="badge rounded-full px-3 py-1 text-xs font-black" key={item}>{item}</span>
                ))}
              </div>
            </div>
            <p className="subtle text-xs">Usuario logado: {actorUserId}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
