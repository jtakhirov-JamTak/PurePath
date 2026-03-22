import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "../replit_integrations/auth";

import { registerJournalRoutes } from "./journals";
import { registerEisenhowerRoutes } from "./eisenhower";
import { registerEmpathyRoutes } from "./empathy";
import { registerHabitRoutes } from "./habits";
import { registerIdentityRoutes } from "./identity";
import { registerToolRoutes } from "./tools";
import { registerOnboardingRoutes } from "./onboarding";
import { registerAccessRoutes } from "./access";
import { registerExportRoutes } from "./export";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerJournalRoutes(app);
  registerEisenhowerRoutes(app);
  registerEmpathyRoutes(app);
  registerHabitRoutes(app);
  registerIdentityRoutes(app);
  registerToolRoutes(app);
  registerOnboardingRoutes(app);
  registerAccessRoutes(app);
  registerExportRoutes(app);

  return httpServer;
}
