import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import i18next from './config';

// Extend Request interface to include t function
declare global {
  namespace Express {
    interface Request {
      t: (key: string, options?: Record<string, unknown>) => string;
      locale: string;
    }
  }
}

// i18n middleware — pt-PT only
export const i18nMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const locale = 'pt-PT';

  // Always use pt-PT
  i18next.changeLanguage(locale);

  // Add t function and locale to request
  req.t = (key: string, options?: Record<string, unknown>) => i18next.t(key, options) as string;
  req.locale = locale;

  next();
};

// Cookie parser middleware (needs to be applied before i18n middleware)
export const cookieParserMiddleware = cookieParser();
