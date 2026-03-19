import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { getUncachableStripeClient } from "../stripeClient";

export function registerBillingRoutes(app: Express) {
  // TODO: remove Stripe routes once all users migrated to access code model
  app.get("/api/purchases", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getPurchasesByUser(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // TODO: remove Stripe routes once all users migrated to access code model
  app.post("/api/stripe/webhook", async (req: any, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const sig = req.headers["stripe-signature"];

      if (!sig) {
        return res.status(400).json({ error: "Missing signature" });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured");
        return res.status(500).json({ error: "Webhook not configured" });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: "Invalid signature" });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { userId, courseType } = session.metadata || {};

        if (userId && courseType) {
          const { created } = await storage.createPurchaseIfNotExists({
            userId,
            courseType,
            stripeSessionId: session.id,
            stripePaymentId: session.payment_intent as string,
            amount: session.amount_total || 0,
            status: "completed",
          });

          if (created) {
            console.log(`Purchase created for user ${userId}, course ${courseType}`);
          } else {
            console.log(`Duplicate webhook ignored for session ${session.id}`);
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  });
}
