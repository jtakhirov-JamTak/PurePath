import type { Express, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import OpenAI from "openai";
import { phase3AnalyzeSchema } from "../validation";
import { aiRateLimit } from "./helpers";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerPhase3Routes(app: Express) {
  app.post("/api/phase3/analyze", isAuthenticated, aiRateLimit, async (req: any, res: Response) => {
    try {
      const parsed = phase3AnalyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const userId = req.user.claims.sub;
      const { documentText } = parsed.data;

      const hasAccess = await storage.hasCourseAccess(userId, "phase3");
      if (!hasAccess) {
        return res.status(403).json({ error: "Phase 3 access required" });
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
}
