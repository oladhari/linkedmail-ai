const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)"
  ).run(email.toLowerCase(), hash);

  const token = makeToken(result.lastInsertRowid);
  res.json({ token });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = makeToken(user.id);
  res.json({ token });
});

// POST /auth/google — sign in with Google access token
router.post("/google", async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: "Missing access token" });

  try {
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`);
    if (!googleRes.ok) return res.status(401).json({ error: "Invalid Google token" });
    const googleUser = await googleRes.json();
    if (!googleUser.email) return res.status(401).json({ error: "Could not get email from Google" });

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(googleUser.email.toLowerCase());
    if (!user) {
      const result = db.prepare(
        "INSERT INTO users (email, name, picture) VALUES (?, ?, ?)"
      ).run(googleUser.email.toLowerCase(), googleUser.name || "", googleUser.picture || "");
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    }

    const token = makeToken(user.id);
    res.json({ token });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google sign-in failed" });
  }
});

// GET /auth/me — returns user info for the extension
router.get("/me", requireAuth, (req, res) => {
  const { id, email, plan, usage_count } = req.user;
  res.json({ id, email, plan, usage_count });
});

module.exports = router;
