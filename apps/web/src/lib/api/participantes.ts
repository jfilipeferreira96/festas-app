import { api } from "./utils";

export interface ParticipanteAPI {
  id: string;
  reservaId: string;
  cacifoId: string | null;
  nome: string;
  presente: boolean;
  cacifo: { id: string; numero: number; nome: string | null } | null;
}

export interface AdicionarParticipantePayload {
  nome: string;
}

export const participantesApi = {
  listar: (reservaId: string) =>
    api<ParticipanteAPI[]>(`/api/participantes?reservaId=${reservaId}`),

  adicionar: (reservaId: string, payload: AdicionarParticipantePayload) =>
    api<{ data: ParticipanteAPI; message: string }>(`/api/participantes`, {
      method: "POST",
      body: JSON.stringify({ reservaId, ...payload }),
    }),

  confirmarPresenca: (participanteId: string, presenca: boolean) =>
    api<{ data: ParticipanteAPI; message: string }>(`/api/participantes/${participanteId}/presenca`, {
      method: "PATCH",
      body: JSON.stringify({ presenca }),
    }),

  marcarTodos: (reservaId: string, presenca: boolean) =>
    api<{ data: ParticipanteAPI[]; message: string }>(`/api/participantes/presenca/em-lote`, {
      method: "PATCH",
      body: JSON.stringify({ reservaId, presenca }),
    }),

  remover: (participanteId: string) =>
    api<{ message: string }>(`/api/participantes/${participanteId}`, {
      method: "DELETE",
    }),
};