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
      
      // Use stable Price ID from env vars if available (production-ready)
      // Otherwise fallback to inline price_data (development)
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

  // ==================== EISENHOWER MATRIX ====================
  
  app.get("/api/eisenhower", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getEisenhowerEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching eisenhower entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.get("/api/eisenhower/week/:weekStart", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart } = req.params;
      const entries = await storage.getEisenhowerEntriesForWeek(userId, weekStart);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching weekly entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/eisenhower", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.createEisenhowerEntry({ userId, ...req.body });
      res.json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ error: "Failed to create entry" });
    }
  });

  app.patch("/api/eisenhower/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateEisenhowerEntry(parseInt(id), req.body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ error: "Failed to update entry" });
    }
  });

  app.delete("/api/eisenhower/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteEisenhowerEntry(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  app.get("/api/eisenhower/export", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getEisenhowerEntriesByUser(userId);
      
      let csv = "Week Start,Role,Task,Quadrant,Deadline,Time Estimate,Decision,Scheduled Time,Completed\n";
      entries.forEach(e => {
        csv += `${e.weekStart},${e.role},"${e.task}",${e.quadrant},${e.deadline || ""},${e.timeEstimate || ""},${e.decision || ""},${e.scheduledTime || ""},${e.completed}\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=eisenhower-matrix.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting eisenhower:", error);
      res.status(500).json({ error: "Failed to export" });
    }
  });

  // ==================== EMPATHY EXERCISES ====================
  
  app.get("/api/empathy", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const exercises = await storage.getEmpathyExercisesByUser(userId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching empathy exercises:", error);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  });

  app.post("/api/empathy", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const exercise = await storage.createEmpathyExercise({ userId, ...req.body });
      res.json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ error: "Failed to create exercise" });
    }
  });

  app.patch("/api/empathy/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const exercise = await storage.updateEmpathyExercise(parseInt(id), req.body);
      res.json(exercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  app.delete("/api/empathy/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteEmpathyExercise(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ error: "Failed to delete exercise" });
    }
  });

  app.get("/api/empathy/export", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const exercises = await storage.getEmpathyExercisesByUser(userId);
      
      let csv = "Date,Who,Context,Their Emotional State,My Emotional State,Facts Observed,How I Came Across,How They Likely Felt,What Matters to Them,What They Need,Next Action\n";
      exercises.forEach(e => {
        csv += `${e.date},"${e.who}","${e.context || ""}","${e.theirEmotionalState || ""}","${e.myEmotionalState || ""}","${e.factsObserved || ""}","${e.howICameAcross || ""}","${e.howTheyLikelyFelt || ""}","${e.whatMattersToThem || ""}","${e.whatTheyNeed || ""}","${e.nextAction || ""}"\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=empathy-exercises.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting empathy:", error);
      res.status(500).json({ error: "Failed to export" });
    }
  });

  // ==================== HABITS ====================
  
  app.get("/api/habits", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const habits = await storage.getHabitsByUser(userId);
      res.json(habits);
    } catch (error) {
      console.error("Error fetching habits:", error);
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check habit limit (6 max)
      const existing = await storage.getHabitsByUser(userId);
      if (existing.filter(h => h.active).length >= 6) {
        return res.status(400).json({ error: "Maximum 6 active habits allowed" });
      }

      const habit = await storage.createHabit({ userId, ...req.body });
      res.json(habit);
    } catch (error) {
      console.error("Error creating habit:", error);
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  app.patch("/api/habits/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const habit = await storage.updateHabit(parseInt(id), req.body);
      res.json(habit);
    } catch (error) {
      console.error("Error updating habit:", error);
      res.status(500).json({ error: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteHabit(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting habit:", error);
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  // ==================== TASKS ====================
  
  app.get("/api/tasks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/date/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.params;
      const tasks = await storage.getTasksForDate(userId, date);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks for date:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      
      // Check task limit for that day (3 max)
      const existingTasks = await storage.getTasksForDate(userId, date);
      if (existingTasks.length >= 3) {
        return res.status(400).json({ error: "Maximum 3 tasks per day allowed" });
      }

      const task = await storage.createTask({ userId, ...req.body });
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(parseInt(id), req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteTask(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  return httpServer;
}
