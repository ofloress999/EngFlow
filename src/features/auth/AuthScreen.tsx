import {
  Building2,
  CheckCircle2,
  HardHat,
  Moon,
  Sparkles,
  Sun,
  UserPlus,
} from "lucide-react";
import { Field } from "../../components";
import type { RegisterForm, ThemeMode } from "../../App";
import type { AuthMode, AuthSubmitHandler, Role } from "../../types";
import { formatCpf, isValidCpf, passwordIssues } from "../../utils/format";

type AuthScreenProps = {
  authMode: AuthMode;
  loginCpf: string;
  loginPassword: string;
  register: RegisterForm;
  isLoading: boolean;
  error: string | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  setAuthMode: (mode: AuthMode) => void;
  setLoginCpf: (value: string) => void;
  setLoginPassword: (value: string) => void;
  setRegister: (value: RegisterForm) => void;
  onLogin: AuthSubmitHandler;
  onRegister: AuthSubmitHandler;
};

export function AuthScreen({
  authMode,
  loginCpf,
  loginPassword,
  register,
  isLoading,
  error,
  theme,
  onToggleTheme,
  setAuthMode,
  setLoginCpf,
  setLoginPassword,
  setRegister,
  onLogin,
  onRegister,
}: AuthScreenProps) {
  const isLogin = authMode === "login";
  const loginCpfError = loginCpf && !isValidCpf(loginCpf) ? "CPF invalido" : null;
  const registerCpfError = register.cpf && !isValidCpf(register.cpf) ? "CPF invalido" : null;
  const passwordHints = passwordIssues(register.password);

  return (
    <main className="min-h-dvh lg:min-h-screen">
      <div className="grid min-h-dvh lg:min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        <section className="auth-grid relative hidden min-h-[46vh] flex-col justify-between overflow-hidden px-6 py-7 text-white sm:px-10 lg:flex lg:min-h-screen lg:px-16">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-2xl shadow-teal-900/20">
                <Building2 size={25} />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight">EngFlow</p>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">
                  Obra conectada
                </p>
              </div>
            </div>
            <button className="icon-button border-white/15 bg-white/10 p-3 text-white" onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="relative z-10 grid gap-10 py-12 lg:grid-cols-[1fr_0.76fr] lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-teal-50">
                <Sparkles size={15} />
                Ecossistema SaaS para obras
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl xl:text-6xl">
                EngFlow
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">
                A plataforma inteligente que conecta engenheiros, arquitetos,
                pedreiros e clientes em um unico fluxo de obra.
              </p>
            </div>

            <div className="construction-visual hidden min-h-72 rounded-[2rem] p-5 sm:block">
              <div className="relative z-10 grid gap-3">
                {["Projeto 3D", "Chamado tecnico", "Atualizacao diaria"].map((item, index) => (
                  <div
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"
                    key={item}
                  >
                    <span className="text-sm font-bold">{item}</span>
                    <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-black">
                      {index === 0 ? "CAD" : index === 1 ? "SLA" : "24h"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden gap-3 text-sm font-semibold text-slate-300 sm:grid sm:grid-cols-3">
            <span>Projetos interativos</span>
            <span>Equipes por funcao</span>
            <span>Fluxos sem reload</span>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-5 sm:px-10 lg:min-h-0 lg:py-10">
          <div className="panel w-full max-w-md rounded-[1.5rem] p-5 shadow-none sm:rounded-[2rem] sm:p-8 sm:shadow-[var(--shadow-soft)]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="badge-accent mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">
                  {isLogin ? "Acesso seguro" : "Novo perfil"}
                </p>
                <h2 className="text-3xl font-black tracking-tight">
                  {isLogin ? "Entrar na conta" : "Criar cadastro"}
                </h2>
                <p className="muted mt-2 text-sm">
                  {isLogin ? "Acesse sua dashboard por funcao." : "Escolha sua funcao para entrar no fluxo correto."}
                </p>
              </div>
              <button
                className="icon-button flex h-11 w-11 shrink-0 items-center justify-center lg:hidden"
                aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
                onClick={onToggleTheme}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="surface-soft hidden rounded-2xl p-3 lg:block">
                <HardHat size={22} />
              </div>
            </div>

            <div className="fade-in" key={authMode}>
              {isLogin ? (
                <form className="space-y-4" onSubmit={onLogin}>
                  <Field
                    label="CPF"
                    value={loginCpf}
                    onChange={(value) => setLoginCpf(formatCpf(value))}
                    placeholder="000.000.000-00"
                    error={loginCpfError}
                    autoComplete="username"
                  />
                  <Field
                    label="Senha"
                    type="password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                  />
                  {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm font-bold text-rose-500">{error}</p>}
                  <button className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 font-bold">
                    <CheckCircle2 size={18} />
                    {isLoading ? "Entrando..." : "Entrar"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full px-4 py-3 text-center font-bold"
                    onClick={() => setAuthMode("register")}
                  >
                    Nao tem conta? Cadastre-se
                  </button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={onRegister}>
                  <Field
                    label="Nome completo"
                    value={register.name}
                    onChange={(value) => setRegister({ ...register, name: value })}
                    placeholder="Seu nome completo"
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={register.email}
                    onChange={(value) => setRegister({ ...register, email: value })}
                    placeholder="voce@email.com"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="CPF"
                      value={register.cpf}
                      onChange={(value) => setRegister({ ...register, cpf: formatCpf(value) })}
                      placeholder="000.000.000-00"
                      error={registerCpfError}
                    />
                    <Field
                      label="Senha"
                      type="password"
                      value={register.password}
                      onChange={(value) => setRegister({ ...register, password: value })}
                      placeholder="Crie uma senha"
                      autoComplete="new-password"
                      hint={
                        passwordHints.length
                          ? `Inclua: ${passwordHints.join(", ")}`
                          : "Senha forte"
                      }
                    />
                  </div>
                  <label className="block">
                    <span className="muted mb-2 block text-sm font-semibold">Funcao</span>
                    <select
                      className="input-shell rounded-xl px-4 py-3"
                      value={register.role}
                      onChange={(event) => setRegister({ ...register, role: event.target.value as Role })}
                    >
                      <option value="pedreiro">Pedreiro</option>
                      <option value="engenheiro">Engenheiro</option>
                      <option value="arquiteto">Arquiteto</option>
                      <option value="cliente">Cliente</option>
                    </select>
                  </label>
                  {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm font-bold text-rose-500">{error}</p>}
                  <button className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 font-bold">
                    <UserPlus size={18} />
                    {isLoading ? "Cadastrando..." : "Cadastrar"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full px-4 py-3 text-center font-bold"
                    onClick={() => setAuthMode("login")}
                  >
                    Voltar para login
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
