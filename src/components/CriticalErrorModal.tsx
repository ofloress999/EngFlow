import { RefreshCcw, TriangleAlert, X } from "lucide-react";

type CriticalErrorModalProps = {
  message: string | null;
  onClose: () => void;
  onRetry?: () => void;
};

export function CriticalErrorModal({ message, onClose, onRetry }: CriticalErrorModalProps) {
  if (!message) return null;

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
        <h2 className="mt-5 text-2xl font-black tracking-tight">Algo saiu do fluxo</h2>
        <p className="muted mt-2 leading-7">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && (
            <button className="btn-primary flex items-center gap-2 px-4 py-3 font-bold" onClick={onRetry}>
              <RefreshCcw size={17} />
              Tentar novamente
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
