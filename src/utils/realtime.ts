export type RealtimeEvent = {
  type: string;
  projectId: string;
  entity: string;
  entityId?: string;
  occurredAt?: string;
};

export function connectProjectRealtime(
  projectId: string,
  onEvent: (event: RealtimeEvent) => void,
) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";
  const wsUrl = apiUrl
    .replace(/^http/i, "ws")
    .replace(/\/api\/?$/, `/ws/projects/${projectId}`);
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as RealtimeEvent);
    } catch {
      // Ignora mensagens fora do contrato do EngFlow.
    }
  };

  return () => {
    socket.close();
  };
}
