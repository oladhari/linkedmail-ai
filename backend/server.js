require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/email");
const stripeRoutes = require("./routes/stripe");

const app = express();

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use("/stripe/webhook", express.raw({ type: "application/json" }));

app.use(cors());
app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`LinkedMail backend running on http://localhost:${PORT}`);
});
