type FieldProps = {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  error?: string | null;
  hint?: string;
  autoComplete?: string;
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
  error,
  hint,
  autoComplete,
}: FieldProps) {
  return (
    <label className="block">
      <span className="muted mb-2 block text-sm font-semibold">{label}</span>
      {multiline ? (
        <textarea
          className="input-shell min-h-28 resize-y rounded-xl px-4 py-3"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <input
          className={`input-shell rounded-xl px-4 py-3 ${error ? "input-error" : ""}`}
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
      )}
      {error && <span className="mt-2 block text-xs font-bold text-rose-500">{error}</span>}
      {!error && hint && <span className="subtle mt-2 block text-xs font-semibold">{hint}</span>}
    </label>
  );
}
