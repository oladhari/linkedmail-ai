const express = require("express");
const { makeToken } = require("../tokens");
const { db } = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// POST /auth/google
router.post("/google", async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: "Missing access token" });

  try {
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!googleRes.ok) return res.status(401).json({ error: "Invalid Google token" });
    const googleUser = await googleRes.json();
    if (!googleUser.email) return res.status(401).json({ error: "Could not get email from Google" });

    const email = googleUser.email.toLowerCase();
    const rs = await db.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });
    let user = rs.rows[0];

    if (!user) {
      const insert = await db.execute({
        sql: "INSERT INTO users (email, name, picture) VALUES (?, ?, ?)",
        args: [email, googleUser.name || "", googleUser.picture || ""],
      });
      const newRs = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [Number(insert.lastInsertRowid)] });
      user = newRs.rows[0];
    }

    res.json({ token: makeToken(user.id) });
  } catch (err) {
    console.error("Google sign-in failed");
    res.status(500).json({ error: "Google sign-in failed" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, (req, res) => {
  const { id, email, plan, usage_count } = req.user;
  res.json({ id: Number(id), email, plan, usage_count: Number(usage_count) });
});

module.exports = router;
