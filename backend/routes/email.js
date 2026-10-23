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
  if (!profile || typeof profile !== "object") return res.status(400).json({ error: "Profile data required" });

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

  // Whitelist tone and purpose — never fall back to raw user input
  const resolvedTone = toneMap[tone] ?? "professional and polished";
  const resolvedPurpose = purposeMap[purpose] ?? "networking and building a professional connection";

  // Strip control characters and enforce length limits on all injected fields
  function sanitize(val, maxLen) {
    if (typeof val !== "string") return "";
    return val.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, maxLen);
  }

  const safeContext = sanitize(context, 500);
  if (safeContext.length === 0 && context) {
    // context was provided but was non-string — ignore silently
  }

  const profileSummary = [
    sanitize(profile.name, 100)        && `Full Name: ${sanitize(profile.name, 100)}`,
    sanitize(profile.currentTitle, 150) && `Current Title: ${sanitize(profile.currentTitle, 150)}`,
    sanitize(profile.currentCompany, 150) && `Current Company: ${sanitize(profile.currentCompany, 150)}`,
    sanitize(profile.headline, 300)    && `LinkedIn Headline: ${sanitize(profile.headline, 300)}`,
    sanitize(profile.location, 100)    && `Location: ${sanitize(profile.location, 100)}`,
    sanitize(profile.about, 1000)      && `About/Summary: ${sanitize(profile.about, 1000)}`,
    Array.isArray(profile.experiences) &&
      profile.experiences.slice(0, 8).map(e => sanitize(e, 200)).filter(Boolean).length &&
      `Experience:\n  - ${profile.experiences.slice(0, 8).map(e => sanitize(e, 200)).filter(Boolean).join("\n  - ")}`,
    sanitize(profile.education, 300)   && `Education: ${sanitize(profile.education, 300)}`,
    sanitize(profile.skills, 300)      && `Skills: ${sanitize(profile.skills, 300)}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are a world-class cold email copywriter. Write a highly personalized cold email using ONLY the real data from the LinkedIn profile below.

LinkedIn Profile Data:
${profileSummary}

Purpose: ${resolvedPurpose}
Tone: ${resolvedTone}
${safeContext ? `Sender's context (product/reason/company): ${safeContext}` : ""}

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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const email = completion.choices[0].message.content.trim();

    await db.execute({
      sql: "UPDATE users SET usage_count = usage_count + 1 WHERE id = ?",
      args: [user.id],
    });
    const rs = await db.execute({ sql: "SELECT usage_count FROM users WHERE id = ?", args: [user.id] });

    res.json({ email, usage_count: Number(rs.rows[0].usage_count) });
  } catch (err) {
    console.error("OpenAI error:");
    res.status(500).json({ error: "Failed to generate email. Please try again." });
  }
});

module.exports = router;
