import { Camera, CheckCircle2, LockKeyhole, Save, ShieldCheck, UserCircle2 } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { engflowApi, getApiErrorMessage } from "../../api/engflowApi";
import { Field } from "../../components";
import type { User } from "../../types";
import { compressImageToDataUrl } from "../../utils/files";
import { formatPhoneBR, passwordIssues } from "../../utils/format";

type ProfileViewProps = {
  user: User;
  onUserUpdate: (user: User) => void;
  onToast: (tone: "success" | "error" | "info", title: string, message?: string) => void;
};

export function ProfileView({ user, onUserUpdate, onToast }: ProfileViewProps) {
  const [form, setForm] = useState({
    fullName: user.name,
    email: user.email,
    phone: formatPhoneBR(user.phone ?? ""),
    avatarDataUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const avatarPreview = form.avatarDataUrl || user.avatarUrl;
  const issues = useMemo(() => passwordIssues(passwordForm.newPassword), [passwordForm.newPassword]);

  async function handleAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const avatarDataUrl = await compressImageToDataUrl(file, 640, 0.82);
      setForm((current) => ({ ...current, avatarDataUrl }));
      onToast("info", "Imagem otimizada", "A foto foi comprimida antes do envio.");
    } catch {
      onToast("error", "Nao foi possivel ler a imagem");
    } finally {
      setIsCompressing(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await engflowApi.updateProfile(user.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        avatarDataUrl: form.avatarDataUrl || undefined,
      });
      onUserUpdate(updated);
      setForm((current) => ({ ...current, avatarDataUrl: "" }));
      onToast("success", "Perfil atualizado", "Suas informacoes foram salvas.");
    } catch (error) {
      onToast("error", getApiErrorMessage(error, "Nao foi possivel salvar alteracoes."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (issues.length > 0) {
      onToast("error", "Senha fraca", `Inclua: ${issues.join(", ")}.`);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onToast("error", "Confirmacao diferente", "Digite a mesma senha nos dois campos.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await engflowApi.changePassword(user.id, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onToast("success", "Senha alterada", "Use a nova senha no proximo acesso.");
    } catch (error) {
      onToast("error", getApiErrorMessage(error, "Nao foi possivel alterar a senha."));
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1fr]">
      <section className="panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt={user.name} />
            ) : (
              <UserCircle2 size={48} />
            )}
          </div>
          <div className="min-w-0">
            <p className="badge-accent mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              Perfil seguro
            </p>
            <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
            <p className="muted mt-1 truncate">{user.email}</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleProfileSubmit}>
          <label className="surface-soft flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4">
            <span>
              <span className="block font-black">Foto de perfil</span>
              <span className="muted mt-1 block text-sm">
                {isCompressing ? "Otimizando imagem..." : "Upload com preview e compressao automatica."}
              </span>
            </span>
            <span className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-bold">
              <Camera size={16} />
              Escolher
            </span>
            <input className="sr-only" type="file" accept="image/*" onChange={handleAvatarSelect} />
          </label>
          <Field
            label="Nome"
            value={form.fullName}
            onChange={(value) => setForm({ ...form, fullName: value })}
            placeholder="Seu nome"
          />
          <Field
            label="Telefone"
            value={form.phone}
            onChange={(value) => setForm({ ...form, phone: formatPhoneBR(value) })}
            placeholder="(11) 99999-9999"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
            placeholder="voce@email.com"
          />
          <button
            className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60"
            disabled={isSavingProfile || isCompressing}
          >
            <Save size={18} />
            {isSavingProfile ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      </section>

      <section className="panel rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="badge mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
              Credenciais
            </p>
            <h2 className="text-2xl font-black tracking-tight">Alterar senha</h2>
            <p className="muted mt-1">Validacao forte e confirmacao antes de salvar.</p>
          </div>
          <ShieldCheck className="text-[var(--accent-strong)]" size={28} />
        </div>

        <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
          <Field
            label="Senha atual"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })}
            autoComplete="current-password"
          />
          <Field
            label="Nova senha"
            type="password"
            value={passwordForm.newPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
            autoComplete="new-password"
            hint={issues.length ? `Inclua: ${issues.join(", ")}` : "Senha forte"}
          />
          <Field
            label="Confirmar nova senha"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
            autoComplete="new-password"
            error={
              passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                ? "A confirmacao nao confere"
                : null
            }
          />
          <button
            className="btn-primary flex items-center justify-center gap-2 px-4 py-3 font-bold disabled:opacity-60"
            disabled={isSavingPassword}
          >
            {isSavingPassword ? <CheckCircle2 size={18} /> : <LockKeyhole size={18} />}
            {isSavingPassword ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </section>
    </div>
  );
}
