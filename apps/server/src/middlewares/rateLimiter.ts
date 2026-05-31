import rateLimit from "express-rate-limit";
import Logger from "../lib/logger";
import type { Request, Response } from "express";

/**
 * Normalize IPv6 addresses (e.g., ::ffff:127.0.0.1 → 127.0.0.1)
 */
function normalizeIp(ip: string | undefined): string {
  if (!ip) return "unknown";
  // IPv4-mapped IPv6 addresses like ::ffff:192.168.1.1
  if (ip.startsWith("::ffff:")) return ip.substring(7);
  return ip;
}

/**
 * Rate limiter for authentication endpoints.
 * Limits: 5 requests per minute per IP.
 * Applied to: /api/auth/* (login, register, password reset, etc.)
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
  handler: (req: Request, res: Response) => {
    Logger.warn(`Rate limit exceeded for auth endpoint: ${normalizeIp(req.ip)} on ${req.method} ${req.path}`);
    res.status(429).json({ error: "Too many authentication attempts. Please try again later." });
  },
});

/**
 * Rate limiter for general API endpoints.
 * Limits: 100 requests per minute per IP.
 * Applied to: /api/* (organizations, teams, services, etc.)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  handler: (req: Request, res: Response) => {
    Logger.warn(`Rate limit exceeded for API: ${normalizeIp(req.ip)} on ${req.method} ${req.path}`);
    res.status(429).json({ error: "Too many requests. Please try again later." });
  },
});

/**
 * Rate limiter for public endpoints.
 * Limits: 200 requests per minute per IP.
 * Applied to: public landing pages, health checks, etc.
 */
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  handler: (req: Request, res: Response) => {
    Logger.warn(`Rate limit exceeded for public endpoint: ${normalizeIp(req.ip)} on ${req.method} ${req.path}`);
    res.status(429).json({ error: "Too many requests. Please try again later." });
  },
});