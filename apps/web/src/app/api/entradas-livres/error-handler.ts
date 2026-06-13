import { createRouteErrorHandler } from "@/lib/route-error";

// Shared error handler for all /api/entradas-livres/* Route Handlers.
export const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "entradaLivre.notFound",
    NOT_ACTIVE: "entradaLivre.notActive",
    CONFIG_NOT_FOUND: "entradaLivre.configNotFound",
  },
  statusMap: {
    NOT_FOUND: 404,
    NOT_ACTIVE: 400,
    CONFIG_NOT_FOUND: 404,
  },
  serviceName: "EntradaLivre",
});
