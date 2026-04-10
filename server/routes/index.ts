import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "../replit_integrations/auth";

import { registerJournalRoutes } from "./journals";
import { registerEisenhowerRoutes } from "./eisenhower";
import { registerHabitRoutes } from "./habits";
import { registerIdentityRoutes } from "./identity";
import { registerPatternRoutes } from "./patterns";
import { registerToolRoutes } from "./tools";
import { registerOnboardingRoutes } from "./onboarding";
import { registerAccessRoutes } from "./access";
import { registerExportRoutes } from "./export";
import { registerAdminRoutes } from "./admin";
import { registerWorkshopSeedRoutes } from "./workshop-seed";
import { registerAnnualCommitmentRoutes } from "./annual-commitment";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerJournalRoutes(app);
  registerEisenhowerRoutes(app);
  registerHabitRoutes(app);
  registerIdentityRoutes(app);
  registerPatternRoutes(app);
  registerToolRoutes(app);
  registerOnboardingRoutes(app);
  registerAccessRoutes(app);
  registerExportRoutes(app);
  registerAdminRoutes(app);
  registerWorkshopSeedRoutes(app);
  registerAnnualCommitmentRoutes(app);

  return httpServer;
}
