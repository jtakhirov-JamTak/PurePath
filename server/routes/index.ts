import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "../replit_integrations/auth";

import { registerBillingRoutes } from "./billing";
import { registerJournalRoutes } from "./journals";
import { registerChatRoutes } from "./chat";
import { registerEisenhowerRoutes } from "./eisenhower";
import { registerEmpathyRoutes } from "./empathy";
import { registerHabitRoutes } from "./habits";
import { registerTaskRoutes } from "./tasks";
import { registerIdentityRoutes } from "./identity";
import { registerToolRoutes } from "./tools";
import { registerPhase3Routes } from "./phase3";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerBillingRoutes(app);
  registerJournalRoutes(app);
  registerChatRoutes(app);
  registerEisenhowerRoutes(app);
  registerEmpathyRoutes(app);
  registerHabitRoutes(app);
  registerTaskRoutes(app);
  registerIdentityRoutes(app);
  registerToolRoutes(app);
  registerPhase3Routes(app);

  return httpServer;
}
