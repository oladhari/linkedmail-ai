const express = require("express");
const OpenAI = require("openai");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FREE_LIMIT = 5;

// POST /email/generate
router.post("/generate", requireAuth, async (req, res) => {
  const user = req.user;

  // Enforce free tier limit
  if (user.plan !== "pro" && user.usage_count >= FREE_LIMIT) {
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
    profile.name && `Name: ${profile.name}`,
    profile.currentTitle && `Title: ${profile.currentTitle}`,
    profile.currentCompany && `Company: ${profile.currentCompany}`,
    profile.headline && `Headline: ${profile.headline}`,
    profile.location && `Location: ${profile.location}`,
    profile.about && `About: ${profile.about}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are an expert cold email writer. Write a personalized cold email based on the LinkedIn profile below.

LinkedIn Profile:
${profileSummary}

Purpose: ${purposeMap[purpose] || purpose}
Tone: ${toneMap[tone] || tone}
${context ? `Additional context from the sender: ${context}` : ""}

Requirements:
- Start with a subject line (format: "Subject: ...")
- Leave a blank line, then write the email body
- Personalize based on the person's actual role, company, and background
- Keep it concise (150-250 words unless tone is "direct")
- End with a clear, single call to action
- Do NOT use generic openers like "I hope this email finds you well"
- Do NOT use placeholders like [Your Name] — use "I" and leave the sign-off as just "Best,"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const email = completion.choices[0].message.content.trim();

    // Increment usage
    db.prepare("UPDATE users SET usage_count = usage_count + 1 WHERE id = ?").run(user.id);
    const updatedUser = db.prepare("SELECT usage_count FROM users WHERE id = ?").get(user.id);

    res.json({ email, usage_count: updatedUser.usage_count });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to generate email. Please try again." });
  }
});

module.exports = router;
