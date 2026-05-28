export function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function cleanCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string) {
  const digits = cleanCpf(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function isValidCpf(value: string) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPhoneBR(value: string) {
  const digits = cleanPhone(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function passwordIssues(password: string) {
  const issues = [];
  if (password.length < 8) issues.push("8 caracteres");
  if (!/[A-Z]/.test(password)) issues.push("letra maiuscula");
  if (!/[a-z]/.test(password)) issues.push("letra minuscula");
  if (!/\d/.test(password)) issues.push("numero");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("simbolo");
  return issues;
}

export function relativeTime(value?: string) {
  if (!value) return "agora";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ha ${hours} h`;
  const days = Math.round(hours / 24);
  return `ha ${days} d`;
}
