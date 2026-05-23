require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { initDb } = require("./db/database");
const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/email");
const stripeRoutes = require("./routes/stripe");

const app = express();

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use("/stripe/webhook", express.raw({ type: "application/json" }));

app.use(cors({
  origin: [
    `chrome-extension://dkfpkbnmjhghhkonkiaiaicpicndnpce`,
    "https://www.linkedmailai.com",
  ],
}));
app.use(express.json());

// Global rate limit: 60 requests/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
}));

// Stricter limit on the expensive AI endpoint: 5 requests/min per IP
app.use("/email/generate", rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many generation requests, please wait a moment." },
}));

// Health check
app.get("/", (req, res) => res.json({ status: "ok", app: "LinkedMail AI" }));

// Routes
app.use("/auth", authRoutes);
app.use("/email", emailRoutes);
app.use("/stripe", stripeRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LinkedMail backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
