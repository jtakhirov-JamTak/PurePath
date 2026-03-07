import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { getUncachableStripeClient } from "../stripeClient";
import { COURSES } from "@shared/schema";
import { checkoutSchema } from "../validation";
import type { AuthRequest } from "./helpers";

export function registerBillingRoutes(app: Express) {
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

  app.post("/api/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const { courseType } = parsed.data;

      if (!COURSES[courseType]) {
        return res.status(400).json({ error: "Invalid course type" });
      }

      const course = COURSES[courseType];
      const stripe = await getUncachableStripeClient();
      
      const stripePriceId = process.env[course.stripePriceEnvVar];
      
      const lineItems = stripePriceId
        ? [{ price: stripePriceId, quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              product_data: {
                name: course.name,
                description: course.description,
              },
              unit_amount: course.price,
            },
            quantity: 1,
          }];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: userEmail,
        line_items: lineItems,
        metadata: {
          userId,
          courseType,
        },
        success_url: `${req.protocol}://${req.get("host")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

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

  app.post("/api/billing/refresh", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const stripe = await getUncachableStripeClient();

      const purchases = await storage.getPurchasesByUser(userId);
      
      if (purchases.length === 0) {
        return res.json({ 
          updated: false, 
          message: "No purchases found. If you just completed a payment, please wait a moment and try again." 
        });
      }

      let updated = false;
      
      for (const purchase of purchases) {
        if (purchase.stripeSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(purchase.stripeSessionId);
            
            if (session.payment_status === "paid" && purchase.status !== "completed") {
              await storage.updatePurchaseStatus(purchase.id, "completed");
              updated = true;
            }
          } catch (stripeError) {
            console.log(`Could not retrieve session ${purchase.stripeSessionId}:`, stripeError);
          }
        }
      }

      res.json({ 
        updated, 
        message: updated 
          ? "Your access has been refreshed successfully." 
          : "Your access is already up to date."
      });
    } catch (error) {
      console.error("Billing refresh error:", error);
      res.status(500).json({ error: "Failed to refresh access" });
    }
  });
}
