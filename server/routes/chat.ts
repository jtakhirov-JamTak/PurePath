import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { format } from "date-fns";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import { chatMessageSchema } from "../validation";
import { aiRateLimit, transcriptionRateLimit } from "./helpers";

const upload = multer({ dest: "/tmp/audio-uploads", limits: { fileSize: 10 * 1024 * 1024 } });

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

export function registerChatRoutes(app: Express) {
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

  app.post("/api/chat/messages", isAuthenticated, aiRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = chatMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { content } = parsed.data;

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
        if (monthlyGoal.successProof) systemPrompt += `\nSuccess proof: ${monthlyGoal.successProof}`;
        if (monthlyGoal.proofMetric) systemPrompt += `\nMetric: ${monthlyGoal.proofMetric}`;
        if (monthlyGoal.weeklyBehavior) systemPrompt += `\nWeekly behavior: ${monthlyGoal.weeklyBehavior}`;
        if (monthlyGoal.bestResult) systemPrompt += `\nBest result: ${monthlyGoal.bestResult}`;
        if (monthlyGoal.innerObstacle) systemPrompt += `\nInner obstacle: ${monthlyGoal.innerObstacle}`;
        if (monthlyGoal.obstacleTrigger) systemPrompt += `\nObstacle trigger: ${monthlyGoal.obstacleTrigger}`;
        if (monthlyGoal.obstacleThought) systemPrompt += `\nObstacle thought: ${monthlyGoal.obstacleThought}`;
        if (monthlyGoal.obstacleEmotion) systemPrompt += `\nObstacle emotion: ${monthlyGoal.obstacleEmotion}`;
        if (monthlyGoal.obstacleBehavior) systemPrompt += `\nObstacle behavior: ${monthlyGoal.obstacleBehavior}`;
        if (monthlyGoal.ifThenPlan1) systemPrompt += `\nIF-THEN plan 1: ${monthlyGoal.ifThenPlan1}`;
        if (monthlyGoal.ifThenPlan2) systemPrompt += `\nIF-THEN plan 2: ${monthlyGoal.ifThenPlan2}`;
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

  app.post("/api/audio/transcribe", isAuthenticated, transcriptionRateLimit, upload.single("audio"), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      const allowedMimes = ["audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/flac"];
      if (!allowedMimes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Unsupported audio format" });
      }
      const fileStream = fs.createReadStream(req.file.path);
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
      });
      fs.unlinkSync(req.file.path);
      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
}
