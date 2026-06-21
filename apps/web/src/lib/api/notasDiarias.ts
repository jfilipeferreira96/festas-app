import { api } from "@/lib/api/utils";

export const notasDiariasApi = {
  getByData: (data: string) =>
    api(`/api/notas-diarias?data=${encodeURIComponent(data)}`, { method: "GET" }),

  upsert: (data: { data: string; notasManha?: string; notasTarde?: string }) =>
    api("/api/notas-diarias", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
};
