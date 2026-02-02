import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { COURSES, type CourseType } from "@shared/schema";
import OpenAI from "openai";
import { format } from "date-fns";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SELF_DISCOVERY_SYSTEM_PROMPT = `You are a compassionate and insightful self-discovery guide. Your role is to help users explore their inner world, understand themselves better, and grow as individuals.

Guidelines:
- Ask thoughtful, open-ended questions that encourage deep reflection
- Listen actively and respond with empathy
- Help users identify patterns in their thoughts and behaviors
- Encourage self-compassion and growth mindset
- Provide insights without being prescriptive
- Create a safe, non-judgmental space for exploration
- Use techniques from various therapeutic approaches (CBT, mindfulness, positive psychology)
- Help users connect with their values, strengths, and aspirations

Remember: You're a guide, not a therapist. Encourage professional help for serious mental health concerns.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const { courseType } = req.body as { courseType: CourseType };

      if (!COURSES[courseType]) {
        return res.status(400).json({ error: "Invalid course type" });
      }

      const course = COURSES[courseType];
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: course.name,
                description: course.description,
              },
              unit_amount: course.price,
            },
            quantity: 1,
          },
        ],
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

  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const sig = req.headers["stripe-signature"];
      
      if (!sig) {
        return res.status(400).json({ error: "Missing signature" });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } else {
        event = req.body;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { userId, courseType } = session.metadata || {};

        if (userId && courseType) {
          await storage.createPurchase({
            userId,
            courseType,
            stripePaymentId: session.payment_intent as string,
            amount: session.amount_total || 0,
            status: "completed",
          });
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  });

  app.get("/api/journals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journals = await storage.getJournalsByUser(userId);
      res.json(journals);
    } catch (error) {
      console.error("Error fetching journals:", error);
      res.status(500).json({ error: "Failed to fetch journals" });
    }
  });

  app.get("/api/journals/:date/:session", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date, session } = req.params;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journal = await storage.getJournal(userId, date, session);
      res.json(journal || null);
    } catch (error) {
      console.error("Error fetching journal:", error);
      res.status(500).json({ error: "Failed to fetch journal" });
    }
  });

  app.post("/api/journals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journal = await storage.createOrUpdateJournal({
        userId,
        ...req.body,
      });
      res.json(journal);
    } catch (error) {
      console.error("Error saving journal:", error);
      res.status(500).json({ error: "Failed to save journal" });
    }
  });

  app.get("/api/journals/export", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const journals = await storage.getJournalsByUser(userId);
      
      let content = "# My Transformation Journal\n\n";
      
      journals.forEach((journal) => {
        content += `## ${journal.date} - ${journal.session.charAt(0).toUpperCase() + journal.session.slice(1)} Session\n\n`;
        
        if (journal.gratitude) {
          content += `### Gratitude\n${journal.gratitude}\n\n`;
        }
        if (journal.intentions) {
          content += `### Intentions\n${journal.intentions}\n\n`;
        }
        if (journal.highlights) {
          content += `### Highlights\n${journal.highlights}\n\n`;
        }
        if (journal.reflections) {
          content += `### Reflections\n${journal.reflections}\n\n`;
        }
        if (journal.challenges) {
          content += `### Challenges\n${journal.challenges}\n\n`;
        }
        if (journal.tomorrowGoals) {
          content += `### Tomorrow's Goals\n${journal.tomorrowGoals}\n\n`;
        }
        content += "---\n\n";
      });

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=my-journals.txt");
      res.send(content);
    } catch (error) {
      console.error("Error exporting journals:", error);
      res.status(500).json({ error: "Failed to export journals" });
    }
  });

  app.get("/api/chat/messages", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      const hasAccess = await storage.hasCourseAccess(userId, "course1");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      const messages = await storage.getChatMessagesByUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { content } = req.body;

      const hasAccess = await storage.hasCourseAccess(userId, "course1");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      await storage.createChatMessage({
        userId,
        role: "user",
        content,
      });

      const history = await storage.getChatMessagesByUser(userId);
      const messages = [
        { role: "system" as const, content: SELF_DISCOVERY_SYSTEM_PROMPT },
        ...history.slice(-20).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.createChatMessage({
        userId,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  return httpServer;
}
