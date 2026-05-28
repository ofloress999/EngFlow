import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastHostProps = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

const icons = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] grid w-[min(92vw,24rem)] gap-3">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <article className={`toast toast-${toast.tone}`} key={toast.id}>
            <Icon size={19} />
            <div className="min-w-0 flex-1">
              <p className="font-black">{toast.title}</p>
              {toast.message && <p className="mt-1 text-sm leading-5 opacity-85">{toast.message}</p>}
            </div>
            <button className="icon-button h-8 w-8 shrink-0 p-1" onClick={() => onDismiss(toast.id)}>
              <X size={15} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
