import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { COURSES, type CourseType, HABIT_CATEGORIES } from "@shared/schema";
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
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const hasAccess = await storage.hasCourseAccess(userId, "course2");
      if (!hasAccess) {
        return res.status(403).json({ error: "Course access required" });
      }

      let journals = await storage.getJournalsByUser(userId);
      if (startDate) journals = journals.filter(j => j.date >= startDate);
      if (endDate) journals = journals.filter(j => j.date <= endDate);

      const habits = await storage.getHabitsByUser(userId);
      const rangeStart = startDate || "2000-01-01";
      const rangeEnd = endDate || "2099-12-31";
      const completions = await storage.getHabitCompletionsForRange(userId, rangeStart, rangeEnd);

      const eisenhower = await storage.getEisenhowerEntriesByUser(userId);
      let filteredEisenhower = eisenhower.filter(e => e.quadrant === "q2" && e.deadline);
      if (startDate) filteredEisenhower = filteredEisenhower.filter(e => e.deadline! >= startDate);
      if (endDate) filteredEisenhower = filteredEisenhower.filter(e => e.deadline! <= endDate);

      const habitMap = new Map(habits.map(h => [h.id, h.name]));
      
      let content = "# Journal Calendar Export\n\n";
      if (startDate || endDate) {
        content += `Date Range: ${startDate || "beginning"} to ${endDate || "present"}\n\n`;
      }

      content += "---\n\n";
      content += "## Journal Entries\n\n";
      
      journals.forEach((journal) => {
        content += `### ${journal.date} - ${journal.session.charAt(0).toUpperCase() + journal.session.slice(1)}\n\n`;
        
        if (journal.content) {
          try {
            const parsed = JSON.parse(journal.content);
            if (journal.session === "morning") {
              if (parsed.intention) content += `**Intention:** ${parsed.intention}\n`;
              if (parsed.gratitude) content += `**Gratitude:** ${parsed.gratitude}\n`;
              if (parsed.joy) content += `**Joy:** ${parsed.joy}\n`;
              if (parsed.enjoy) content += `**Enjoy:** ${parsed.enjoy}\n`;
              if (parsed.avoidance) content += `**Avoidance:** ${parsed.avoidance}\n`;
              if (parsed.understanding) content += `**Understanding:** ${parsed.understandingEmotion ? `(${parsed.understandingEmotion}) ` : ""}${parsed.understanding}\n`;
              if (parsed.counterEvidence) content += `**Counter-Evidence:** ${parsed.counterEvidence}\n`;
              if (parsed.courageAction) content += `**Courage Action:** ${parsed.courageAction}\n`;
              if (parsed.stress) content += `**Stress:** ${parsed.stress}\n`;
              if (parsed.perspectiveShift) content += `**Perspective Shift:** ${parsed.perspectiveShift}\n`;
            } else {
              if (parsed.review) content += `**Review:** ${parsed.review}\n`;
              if (parsed.feedback) content += `**Feedback:** ${parsed.feedback}\n`;
              if (parsed.insight) content += `**Insight:** ${parsed.insight}\n`;
              if (parsed.lesson) content += `**Lesson:** ${parsed.lesson}\n`;
              if (parsed.trigger) content += `**Trigger:** ${parsed.trigger}\n`;
              if (parsed.triggerStory) content += `**Story:** ${parsed.triggerStory}\n`;
              if (parsed.triggerImpulse) content += `**Impulse:** ${parsed.triggerImpulse}\n`;
              if (parsed.triggerEmotion) content += `**Emotion:** ${parsed.triggerEmotion}${parsed.triggerEmotionLevel ? ` (${parsed.triggerEmotionLevel}/10)` : ""}\n`;
              if (parsed.triggerUrge) content += `**Urge:** ${parsed.triggerUrge}${parsed.triggerUrgeLevel ? ` (${parsed.triggerUrgeLevel}/10)` : ""}\n`;
              if (parsed.triggerBehavior) content += `**Behavior:** ${parsed.triggerBehavior}\n`;
              if (parsed.triggerOutcome) content += `**Outcome:** ${parsed.triggerOutcome}\n`;
              if (parsed.triggerNextTime) content += `**Next Time:** ${parsed.triggerNextTime}\n`;
              if (parsed.satisfied) content += `**Satisfied With:** ${parsed.satisfied}\n`;
              if (parsed.dissatisfied) content += `**Dissatisfied With:** ${parsed.dissatisfied}\n`;
              if (parsed.shutdownEnough) content += `**Today Was Enough Because:** ${parsed.shutdownEnough}\n`;
              if (parsed.shutdownTomorrow) content += `**Tomorrow's First Step:** ${parsed.shutdownTomorrow}\n`;
            }
          } catch {
            if (journal.gratitude) content += `**Gratitude:** ${journal.gratitude}\n`;
            if (journal.intentions) content += `**Intentions:** ${journal.intentions}\n`;
            if (journal.highlights) content += `**Highlights:** ${journal.highlights}\n`;
            if (journal.reflections) content += `**Reflections:** ${journal.reflections}\n`;
            if (journal.challenges) content += `**Challenges:** ${journal.challenges}\n`;
            if (journal.tomorrowGoals) content += `**Tomorrow's Goals:** ${journal.tomorrowGoals}\n`;
          }
        }
        content += "\n";
      });

      if (completions.length > 0) {
        content += "---\n\n## Habit Tracking\n\n";
        const byDate = new Map<string, Array<{ name: string; status: string }>>();
        completions.forEach((c: any) => {
          const name = habitMap.get(c.habitId) || `Habit #${c.habitId}`;
          if (!byDate.has(c.date)) byDate.set(c.date, []);
          byDate.get(c.date)!.push({ name, status: c.status || "completed" });
        });
        const sortedDates = Array.from(byDate.keys()).sort();
        sortedDates.forEach(date => {
          content += `### ${date}\n`;
          byDate.get(date)!.forEach(h => {
            const icon = h.status === "completed" ? "[x]" : "[-]";
            content += `- ${icon} ${h.name} (${h.status})\n`;
          });
          content += "\n";
        });
      }

      if (filteredEisenhower.length > 0) {
        content += "---\n\n## Scheduled Items (Eisenhower Q2)\n\n";
        filteredEisenhower.forEach(e => {
          const status = e.completed ? "[x]" : "[ ]";
          content += `- ${status} ${e.task} (${e.role}, deadline: ${e.deadline})${e.scheduledTime ? ` @ ${e.scheduledTime}` : ""}\n`;
        });
        content += "\n";
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename=journal-export${startDate ? `-${startDate}` : ""}${endDate ? `-to-${endDate}` : ""}.txt`);
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
      const currentMonth = format(new Date(), "yyyy-MM");
      const monthlyGoal = await storage.getMonthlyGoal(userId, currentMonth);
      let systemPrompt = SELF_DISCOVERY_SYSTEM_PROMPT;
      const hasGoal = monthlyGoal?.goalWhat || monthlyGoal?.goalStatement;
      if (hasGoal) {
        systemPrompt += `\n\nIMPORTANT CONTEXT — The user's current monthly goal:`;
        if (monthlyGoal.goalWhat) systemPrompt += `\nWhat: ${monthlyGoal.goalWhat}`;
        if (monthlyGoal.goalWhen) systemPrompt += `\nWhen: ${monthlyGoal.goalWhen}`;
        if (monthlyGoal.goalWhere) systemPrompt += `\nWhere: ${monthlyGoal.goalWhere}`;
        if (monthlyGoal.goalHow) systemPrompt += `\nHow: ${monthlyGoal.goalHow}`;
        if (monthlyGoal.goalStatement) systemPrompt += `\nGoal summary: ${monthlyGoal.goalStatement}`;
        if (monthlyGoal.value) systemPrompt += `\nValue it serves: ${monthlyGoal.value}`;
        if (monthlyGoal.strengths) systemPrompt += `\nStrengths: ${monthlyGoal.strengths}`;
        if (monthlyGoal.blockingHabit) systemPrompt += `\nBlocking habit: ${monthlyGoal.blockingHabit}`;
        if (monthlyGoal.habitAddress) systemPrompt += `\nPlan to address it: ${monthlyGoal.habitAddress}`;
        systemPrompt += `\nWeave this goal context naturally into your coaching when relevant. Don't force it, but be aware of it.`;
      }
      const messages = [
        { role: "system" as const, content: systemPrompt },
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
      const body = { ...req.body };
      if (body.status !== undefined) {
        body.completed = body.status === "completed";
      } else if (body.completed !== undefined) {
        body.status = body.completed ? "completed" : null;
      }
      const entry = await storage.updateEisenhowerEntry(parseInt(id), body);
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
      
      // Check habit limit (5 max)
      const existing = await storage.getHabitsByUser(userId);
      if (existing.filter(h => h.active).length >= 5) {
        return res.status(400).json({ error: "Maximum 5 active habits allowed" });
      }

      const { category, ...rest } = req.body;
      const validCategory = category && category in HABIT_CATEGORIES ? category : "health";
      const habit = await storage.createHabit({ userId, category: validCategory, ...rest });
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

  // ==================== HABIT COMPLETIONS ====================

  app.get("/api/habit-completions/range/:startDate/:endDate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.params;
      const completions = await storage.getHabitCompletionsForRange(userId, startDate, endDate);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching habit completions range:", error);
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.get("/api/habit-completions/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.params;
      const completions = await storage.getHabitCompletionsForDate(userId, date);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching habit completions:", error);
      res.status(500).json({ error: "Failed to fetch habit completions" });
    }
  });

  app.post("/api/habit-completions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { habitId, date, status } = req.body;
      if (!habitId || !date) {
        return res.status(400).json({ error: "habitId and date are required" });
      }
      const validStatus = status === "skipped" ? "skipped" : "completed";
      const userHabits = await storage.getHabitsByUser(userId);
      if (!userHabits.some(h => h.id === habitId)) {
        return res.status(403).json({ error: "Habit not found" });
      }
      const completion = await storage.createHabitCompletion({ userId, habitId, date, status: validStatus });
      res.json(completion);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Already completed" });
      }
      console.error("Error creating habit completion:", error);
      res.status(500).json({ error: "Failed to create habit completion" });
    }
  });

  app.patch("/api/habit-completions/:habitId/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { habitId, date } = req.params;
      const { status } = req.body;
      const validStatus = status === "skipped" ? "skipped" : "completed";
      await storage.updateHabitCompletionStatus(userId, parseInt(habitId), date, validStatus);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating habit completion:", error);
      res.status(500).json({ error: "Failed to update habit completion" });
    }
  });

  app.delete("/api/habit-completions/:habitId/:date", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { habitId, date } = req.params;
      await storage.deleteHabitCompletion(userId, parseInt(habitId), date);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting habit completion:", error);
      res.status(500).json({ error: "Failed to delete habit completion" });
    }
  });

  // ==================== MEDITATION INSIGHTS ====================

  app.get("/api/meditation-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await storage.getMeditationInsightsByUser(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching meditation insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.post("/api/meditation-insights", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { date, insight } = req.body;
      if (!date || !insight) {
        return res.status(400).json({ error: "date and insight are required" });
      }
      const newInsight = await storage.createMeditationInsight({ userId, date, insight });
      res.json(newInsight);
    } catch (error) {
      console.error("Error creating meditation insight:", error);
      res.status(500).json({ error: "Failed to save insight" });
    }
  });

  app.delete("/api/meditation-insights/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteMeditationInsight(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meditation insight:", error);
      res.status(500).json({ error: "Failed to delete insight" });
    }
  });

  // ==================== IDENTITY DOCUMENT ====================

  app.get("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const doc = await storage.getIdentityDocument(userId);
      res.json(doc || { userId, identity: "", vision: "", values: "", yearVision: "", yearVisualization: "", purpose: "", todayValue: "", todayIntention: "", todayReflection: "" });
    } catch (error) {
      console.error("Error fetching identity document:", error);
      res.status(500).json({ error: "Failed to fetch identity document" });
    }
  });

  app.put("/api/identity-document", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { identity, vision, values, yearVision, yearVisualization, purpose, todayValue, todayIntention, todayReflection, visionBoardMain, visionBoardLeft, visionBoardRight } = req.body;
      const doc = await storage.upsertIdentityDocument({
        userId,
        identity: identity || "",
        vision: vision || "",
        values: values || "",
        yearVision: yearVision ?? "",
        yearVisualization: yearVisualization ?? "",
        purpose: purpose ?? "",
        todayValue: todayValue || "",
        todayIntention: todayIntention ?? "",
        todayReflection: todayReflection ?? "",
        visionBoardMain: visionBoardMain ?? "",
        visionBoardLeft: visionBoardLeft ?? "",
        visionBoardRight: visionBoardRight ?? "",
      });
      res.json(doc);
    } catch (error) {
      console.error("Error saving identity document:", error);
      res.status(500).json({ error: "Failed to save identity document" });
    }
  });

  app.put("/api/vision-board", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { slot, imageData } = req.body;
      if (!["main", "left", "right"].includes(slot)) {
        return res.status(400).json({ error: "Invalid slot. Use main, left, or right." });
      }
      const existing = await storage.getIdentityDocument(userId);
      const updates: any = {
        userId,
        identity: existing?.identity || "",
        vision: existing?.vision || "",
        values: existing?.values || "",
        yearVision: existing?.yearVision ?? "",
        yearVisualization: existing?.yearVisualization ?? "",
        purpose: existing?.purpose ?? "",
        todayValue: existing?.todayValue || "",
        todayIntention: existing?.todayIntention ?? "",
        todayReflection: existing?.todayReflection ?? "",
        visionBoardMain: existing?.visionBoardMain ?? "",
        visionBoardLeft: existing?.visionBoardLeft ?? "",
        visionBoardRight: existing?.visionBoardRight ?? "",
      };
      if (slot === "main") updates.visionBoardMain = imageData || "";
      if (slot === "left") updates.visionBoardLeft = imageData || "";
      if (slot === "right") updates.visionBoardRight = imageData || "";
      const doc = await storage.upsertIdentityDocument(updates);
      res.json({ success: true, slot });
    } catch (error) {
      console.error("Error saving vision board:", error);
      res.status(500).json({ error: "Failed to save vision board image" });
    }
  });

  // ==================== MONTHLY GOALS ====================

  app.get("/api/monthly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const monthKey = (req.query.month as string) || format(new Date(), "yyyy-MM");
      const goal = await storage.getMonthlyGoal(userId, monthKey);
      res.json(goal || { userId, monthKey, goalStatement: "", successMarker: "", value: "", why: "", nextConcreteStep: "", prize: "", strengths: "", advantage: "", goalWhat: "", goalWhen: "", goalWhere: "", goalHow: "", blockingHabit: "", habitAddress: "", fun: "", deadline: "" });
    } catch (error) {
      console.error("Error fetching monthly goal:", error);
      res.status(500).json({ error: "Failed to fetch monthly goal" });
    }
  });

  app.put("/api/monthly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { monthKey, goalStatement, successMarker, value, why, nextConcreteStep, prize,
        strengths, advantage, goalWhat, goalWhen, goalWhere, goalHow, blockingHabit, habitAddress, fun, deadline } = req.body;
      const goal = await storage.upsertMonthlyGoal({
        userId,
        monthKey: monthKey || format(new Date(), "yyyy-MM"),
        goalStatement: goalStatement || "",
        successMarker: successMarker ?? "",
        value: value ?? "",
        why: why ?? "",
        nextConcreteStep: nextConcreteStep || "",
        prize: prize ?? "",
        strengths: strengths ?? "",
        advantage: advantage ?? "",
        goalWhat: goalWhat ?? "",
        goalWhen: goalWhen ?? "",
        goalWhere: goalWhere ?? "",
        goalHow: goalHow ?? "",
        blockingHabit: blockingHabit ?? "",
        habitAddress: habitAddress ?? "",
        fun: fun ?? "",
        deadline: deadline ?? "",
      });
      res.json(goal);
    } catch (error) {
      console.error("Error saving monthly goal:", error);
      res.status(500).json({ error: "Failed to save monthly goal" });
    }
  });

  // ==================== QUARTERLY GOALS ====================

  app.get("/api/quarterly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const quarterKey = req.query.quarter as string;
      if (!quarterKey) {
        return res.status(400).json({ error: "quarter parameter required" });
      }
      const goal = await storage.getQuarterlyGoal(userId, quarterKey);
      res.json(goal || { userId, quarterKey, outcomeStatement: "", measurementPlan: "", baseline: "", target: "", prize: "" });
    } catch (error) {
      console.error("Error fetching quarterly goal:", error);
      res.status(500).json({ error: "Failed to fetch quarterly goal" });
    }
  });

  app.put("/api/quarterly-goal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { quarterKey, outcomeStatement, measurementPlan, baseline, target, prize } = req.body;
      if (!quarterKey) {
        return res.status(400).json({ error: "quarterKey is required" });
      }
      const goal = await storage.upsertQuarterlyGoal({
        userId,
        quarterKey,
        quarterlyFocus: "",
        outcomeStatement: outcomeStatement ?? "",
        measurementPlan: measurementPlan ?? "",
        baseline: baseline ?? "",
        target: target ?? "",
        prize: prize ?? "",
      });
      res.json(goal);
    } catch (error) {
      console.error("Error saving quarterly goal:", error);
      res.status(500).json({ error: "Failed to save quarterly goal" });
    }
  });

  // ==================== PHASE 3 - TRANSFORMATION AGENT ====================
  
  app.post("/api/phase3/analyze", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { documentText } = req.body;

      const hasAccess = await storage.hasCourseAccess(userId, "phase3");
      if (!hasAccess) {
        return res.status(403).json({ error: "Phase 3 access required" });
      }

      if (!documentText || documentText.trim().length < 50) {
        return res.status(400).json({ error: "Please provide at least 50 characters of text to analyze." });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert in behavioral psychology, personal development, and pattern recognition. 
The user will share their self-discovery documents (journal entries, GPT conversation outputs, personal reflections).

Your task is to:
1. **Identify Core Patterns**: Find recurring themes, beliefs, behaviors, and emotional patterns across the text.
2. **Highlight Strengths**: Identify positive patterns, growth areas, and inherent strengths.
3. **Surface Blind Spots**: Gently point out patterns the person may not be aware of.
4. **Map Belief Systems**: Identify core beliefs (both empowering and limiting) that drive behavior.
5. **Provide Transformation Roadmap**: Give specific, actionable steps to transform limiting patterns.
6. **Create Identity Summary**: Summarize who this person is based on the data - their values, motivations, fears, and aspirations.

Format your response as a comprehensive transformation report with clear sections and practical insights.
Be compassionate but honest. Use evidence from their text to support your observations.`
          },
          {
            role: "user",
            content: `Please analyze the following self-discovery documents and create my transformation report:\n\n${documentText}`
          }
        ],
        stream: true,
        max_completion_tokens: 4096,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Phase 3 analysis error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze document" });
      }
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
