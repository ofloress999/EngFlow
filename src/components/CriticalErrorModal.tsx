import { RefreshCcw, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

type CriticalErrorModalProps = {
  message: string | null;
  onClose: () => void;
  onRetry?: () => void;
};

export function CriticalErrorModal({ message, onClose, onRetry }: CriticalErrorModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  if (!message) return null;

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section className="panel w-full max-w-md rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="surface-soft rounded-2xl p-3 text-rose-500">
            <TriangleAlert size={25} />
          </div>
          <button className="icon-button p-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight">Nao foi possivel continuar agora</h2>
        <p className="muted mt-2 leading-7">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && (
            <button className="btn-primary flex items-center gap-2 px-4 py-3 font-bold disabled:opacity-60" onClick={() => void handleRetry()} disabled={isRetrying}>
              <RefreshCcw size={17} />
              {isRetrying ? "Carregando..." : "Tentar de novo"}
            </button>
          )}
          <button className="btn-secondary px-4 py-3 font-bold" onClick={onClose}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}
