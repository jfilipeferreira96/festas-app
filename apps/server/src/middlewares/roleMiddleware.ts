import type { Request, Response, NextFunction } from "express";
import Logger from "@/lib/logger";

type FuncaoUtilizador = "ADMINISTRADOR" | "GESTOR" | "RECECAO" | "MARKETING";

/**
 * Middleware to check if the authenticated user has the required role(s).
 * Must be used AFTER `requireAuth` middleware (which sets req.user).
 *
 * Usage:
 *   router.post("/reservas", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), createReserva);
 *
 * @param allowedFuncoes - Roles that are allowed to access the route
 */
export const requireFuncao = (...allowedFuncoes: FuncaoUtilizador[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: req.t("auth.unauthorized") });
      }

      // Get the user's funcao from the user object (set by Better Auth)
      const userFuncao = (user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;

      if (!userFuncao) {
        Logger.warn("User has no funcao assigned", { userId: user.id });
        return res.status(403).json({ error: req.t("auth.accessDenied") });
      }

      if (!allowedFuncoes.includes(userFuncao)) {
        Logger.info("Funcao check failed", {
          userId: user.id,
          userFuncao,
          requiredFuncoes: allowedFuncoes,
        });
        return res.status(403).json({ error: req.t("auth.insufficientPermissions") });
      }

      next();
    } catch (error) {
      Logger.error("Error in requireFuncao middleware:", { error });
      return res.status(500).json({ error: req.t("errors.internalError") });
    }
  };
};
