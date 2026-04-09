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
    profile.name && `Full Name: ${profile.name}`,
    profile.currentTitle && `Current Title: ${profile.currentTitle}`,
    profile.currentCompany && `Current Company: ${profile.currentCompany}`,
    profile.headline && `LinkedIn Headline: ${profile.headline}`,
    profile.location && `Location: ${profile.location}`,
    profile.about && `About/Summary: ${profile.about}`,
    profile.experiences && profile.experiences.length && `Experience History:\n  - ${profile.experiences.join("\n  - ")}`,
    profile.education && `Education: ${profile.education}`,
    profile.skills && `Skills: ${profile.skills}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a world-class cold email copywriter. Write a highly personalized cold email using ONLY the real data from the LinkedIn profile below.

LinkedIn Profile Data:
${profileSummary}

Purpose: ${purposeMap[purpose] || purpose}
Tone: ${toneMap[tone] || tone}
${context ? `Sender's context (product/reason/company): ${context}` : ""}

STRICT RULES — violating any of these makes the email useless:
1. Use the person's ACTUAL first name from the profile (e.g. "Hi Michel," not "Hi [Name],")
2. NEVER use placeholders like [Name], [Company], [Your Position], [X years] — use real data or omit
3. Reference their REAL company, title, or specific detail from their background
4. If you mention years of experience, calculate it from their experience history
5. Subject line must be specific to this person — not generic
6. Do NOT say "I hope this email finds you well" or any filler opener
7. End with ONE clear call to action (e.g. "Would you be open to a 15-min call this week?")
8. Sign off with just "Best," — no name, no placeholders
9. Format: "Subject: ..." then blank line then email body
10. Length: 100-180 words (short and punchy wins)`;

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
