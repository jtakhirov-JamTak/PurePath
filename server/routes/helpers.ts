import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

export interface AuthRequest extends Request {
  user: { claims: { sub: string; email?: string } };
}

export function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseDateParam(raw: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/** Parse a date param and verify it falls on a Monday (weekStartsOn: 1) */
export function parseMondayParam(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(raw + "T12:00:00Z");
  // getUTCDay(): 0=Sun, 1=Mon
  return d.getUTCDay() === 1 ? raw : null;
}

export function csvEscape(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  const needsEscape = /[",\n\r]/.test(s) || /^[=+\-@\t\r]/.test(s);
  if (needsEscape) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many AI requests. Please wait a minute before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
});

export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Too many write requests. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
});

export const exportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many export requests. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
});
