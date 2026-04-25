const express = require("express");
const OpenAI = require("openai");
const { db } = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FREE_LIMIT = 5;

router.post("/generate", requireAuth, async (req, res) => {
  const user = req.user;

  if (user.plan !== "pro" && Number(user.usage_count) >= FREE_LIMIT) {
    return res.status(403).json({
      error: `Free plan limit reached (${FREE_LIMIT} emails/month). Please upgrade to Pro.`,
    });
  }

  const { profile, tone, purpose, context } = req.body;
  if (!profile) return res.status(400).json({ error: "Profile data required" });

  const toneMap = {
    professional: "professional and polished",
    friendly: "warm and friendly",
    direct: "direct and concise (under 100 words)",
    casual: "casual and conversational",
  };

  const purposeMap = {
    sales: "selling a product or service",
    recruiting: "recruiting for a job opportunity",
    partnership: "exploring a business partnership",
    networking: "networking and building a professional connection",
  };

  const profileSummary = [
    profile.name && `Full Name: ${profile.name}`,
    profile.currentTitle && `Current Title: ${profile.currentTitle}`,
    profile.currentCompany && `Current Company: ${profile.currentCompany}`,
    profile.headline && `LinkedIn Headline: ${profile.headline}`,
    profile.location && `Location: ${profile.location}`,
    profile.about && `About/Summary: ${profile.about}`,
    profile.experiences?.length && `Experience:\n  - ${profile.experiences.join("\n  - ")}`,
    profile.education && `Education: ${profile.education}`,
    profile.skills && `Skills: ${profile.skills}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are a world-class cold email copywriter. Write a highly personalized cold email using ONLY the real data from the LinkedIn profile below.

LinkedIn Profile Data:
${profileSummary}

Purpose: ${purposeMap[purpose] || purpose}
Tone: ${toneMap[tone] || tone}
${context ? `Sender's context (product/reason/company): ${context}` : ""}

STRICT RULES:
1. Use the person's ACTUAL first name (e.g. "Hi Michel," not "Hi [Name],")
2. NEVER use placeholders like [Name], [Company], [Your Position]
3. Reference their REAL company, title, or specific detail from their background
4. Subject line must be specific to this person
5. Do NOT say "I hope this email finds you well"
6. End with ONE clear call to action
7. Sign off with just "Best,"
8. Format: "Subject: ..." then blank line then email body
9. Length: 100-180 words`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.execute({
      sql: "UPDATE users SET usage_count = usage_count + 1 WHERE id = ?",
      args: [user.id],
    });
    const rs = await db.execute({ sql: "SELECT usage_count FROM users WHERE id = ?", args: [user.id] });

    res.write(`data: ${JSON.stringify({ done: true, usage_count: Number(rs.rows[0].usage_count) })}\n\n`);
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate email. Please try again." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Generation failed. Please try again." })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
