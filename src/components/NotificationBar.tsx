import { Bell, CheckCircle2, RefreshCw, X, XCircle } from "lucide-react";
import { useState } from "react";
import type { AppNotification } from "../types";
import { relativeTime } from "../utils/format";

type NotificationBarProps = {
  notifications: AppNotification[];
  onAcceptInvitation: (notification: AppNotification) => void;
  onDeclineInvitation: (notification: AppNotification) => void;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkRead: (notification: AppNotification) => Promise<void>;
  onClear: () => Promise<void>;
  onRefresh: () => void;
};

export function NotificationBar({
  notifications,
  onAcceptInvitation,
  onDeclineInvitation,
  onOpenNotification,
  onMarkRead,
  onClear,
  onRefresh,
}: NotificationBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const count = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="relative">
      <button
        className="icon-button relative flex h-11 w-11 items-center justify-center"
        title="Notificacoes"
        aria-label="Notificacoes"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-black text-white">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="panel fixed left-1/2 top-20 z-40 w-[min(92vw,25rem)] -translate-x-1/2 rounded-2xl p-4 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:translate-x-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Notificacoes</h2>
              <p className="muted text-sm">{count > 0 ? `${count} nao lida${count > 1 ? "s" : ""}` : "Tudo certo"}</p>
            </div>
            <div className="flex gap-2">
              {count > 0 && (
                <button
                  className="btn-secondary px-3 py-2 text-xs font-bold"
                  title="Limpar notificacoes"
                  onClick={() => void onClear()}
                >
                  Limpar
                </button>
              )}
              <button className="icon-button p-2" title="Atualizar" onClick={onRefresh}>
                <RefreshCw size={16} />
              </button>
              <button className="icon-button p-2" title="Fechar" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid max-h-96 gap-3 overflow-y-auto pr-1 scrollbar-soft">
            {notifications.map((notification) => (
              <article className={`panel-flat rounded-2xl p-4 ${notification.read ? "opacity-70" : ""}`} key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black">{notification.title}</h3>
                    <p className="muted mt-1 text-sm leading-6">{notification.message}</p>
                    <p className="subtle mt-2 text-xs font-bold">{relativeTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read && <span className="status-dot mt-1" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {notification.projectId && notification.type !== "INVITATION" && (
                    <button
                      className="btn-primary px-3 py-2 text-xs font-bold"
                      onClick={async () => {
                        await onMarkRead(notification);
                        onOpenNotification(notification);
                        setIsOpen(false);
                      }}
                    >
                      Abrir
                    </button>
                  )}
                  {notification.type === "INVITATION" && (
                    <>
                      <button
                        className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs font-bold"
                        onClick={() => onAcceptInvitation(notification)}
                      >
                        <CheckCircle2 size={15} />
                        Aceitar
                      </button>
                      <button
                        className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs font-bold"
                        onClick={() => onDeclineInvitation(notification)}
                      >
                        <XCircle size={15} />
                        Recusar
                      </button>
                    </>
                  )}
                  {!notification.read && (
                    <button
                      className="btn-secondary px-3 py-2 text-xs font-bold"
                      onClick={() => onMarkRead(notification)}
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </article>
            ))}
            {notifications.length === 0 && (
              <div className="surface-soft rounded-2xl p-5 text-center">
                <p className="font-bold">Nenhuma notificacao agora.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
