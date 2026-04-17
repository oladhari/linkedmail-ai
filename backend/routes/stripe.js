const express = require("express");
const Stripe = require("stripe");
const { db } = require("../db/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /stripe/checkout — create Stripe checkout session
router.post("/checkout", requireAuth, async (req, res) => {
  const user = req.user;

  try {
    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await db.execute({ sql: "UPDATE users SET stripe_customer_id = ? WHERE id = ?", args: [customerId, user.id] });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/stripe/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Could not create checkout session" });
  }
});

// GET /stripe/success — redirect page after payment
router.get("/success", async (req, res) => {
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>Payment successful! 🎉</h2>
      <p>Your Pro plan is now active. Go back to the extension and click refresh.</p>
      <script>window.close();</script>
    </body></html>
  `);
});

router.get("/cancel", (req, res) => {
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>Payment cancelled.</h2>
      <p>You can upgrade anytime from the extension.</p>
      <script>window.close();</script>
    </body></html>
  `);
});

// POST /stripe/webhook — Stripe sends events here
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    await db.execute({
      sql: "UPDATE users SET plan = 'pro', stripe_subscription_id = ? WHERE stripe_customer_id = ?",
      args: [subscriptionId, customerId],
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await db.execute({
      sql: "UPDATE users SET plan = 'free' WHERE stripe_subscription_id = ?",
      args: [subscription.id],
    });
  }

  res.json({ received: true });
});

module.exports = router;
