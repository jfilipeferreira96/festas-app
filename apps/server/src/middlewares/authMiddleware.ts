import type { Request, Response, NextFunction } from "express";
import { auth } from "@festas/auth";
import type { User } from "@festas/auth/types";
import Logger from "@/lib/logger";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {

    if (res.locals.user) {
      req.user = res.locals.user;
      return next();
    }

    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return res.status(401).json({
        error: "Unauthorized - Please login to access this resource",
      });
    }

    req.user = session.user;
    res.locals.user = session.user;

    next();
  } catch (error: any) {
    Logger.error("Authentication error:", error);
    
    return res.status(401).json({
      error: "Authentication failed",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};
