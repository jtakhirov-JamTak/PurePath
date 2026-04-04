import type { Express } from "express";
import passport from "passport";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "../../storage";
import { registerSchema, loginSchema } from "../../validation";

// Rate limit for auth endpoints: 5 attempts per minute per IP
const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Please wait a minute before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Timing-safe string comparison to prevent side-channel attacks */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to burn constant time, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register a new account (public, rate-limited)
  app.post("/api/auth/register", authRateLimit, async (req: any, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message || "Invalid input";
        return res.status(400).json({ error: firstError });
      }
      const { email, password, firstName, lastName, accessCode } = parsed.data;

      // Validate access code — fail hard if ACCESS_CODE is not configured
      const validCode = process.env.ACCESS_CODE;
      if (!validCode) {
        console.error("ACCESS_CODE environment variable is not set");
        return res.status(500).json({ error: "Server configuration error" });
      }
      if (!timingSafeCompare(accessCode.trim(), validCode)) {
        return res.status(403).json({ error: "Invalid access code" });
      }

      // Check if email already exists — generic message to prevent enumeration
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await authStorage.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: "Unable to create account. Please try a different email or sign in." });
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = crypto.randomUUID();
      const user = await authStorage.upsertUser({
        id: userId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash,
      });

      // Grant access and store email as personalEmail (they provided the access code)
      await storage.upsertUserSettings(userId, {
        hasAccess: true,
        personalEmail: normalizedEmail,
      });

      // Build session user object with the claims shape all routes expect
      const userObj = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
      };

      // Regenerate session to prevent fixation, then log in
      req.session.regenerate((regenErr: any) => {
        if (regenErr) {
          console.error("Session regenerate error:", regenErr);
          return res.status(500).json({ error: "Registration failed" });
        }
        req.login(userObj, (err: any) => {
          if (err) {
            console.error("Login after register failed:", err);
            return res.status(500).json({ error: "Registration succeeded but login failed" });
          }
          res.json({
            success: true,
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login (public, rate-limited)
  app.post("/api/auth/login", authRateLimit, (req: any, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      return res.status(400).json({ error: firstError });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      // Regenerate session to prevent fixation, then log in
      req.session.regenerate((regenErr: any) => {
        if (regenErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            return res.status(500).json({ error: "Login failed" });
          }
          res.json({
            success: true,
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
            },
          });
        });
      });
    })(req, res, next);
  });

  // Logout (POST — primary)
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout(() => {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Logout (GET — backward compat)
  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.redirect("/");
      });
    });
  });
}
