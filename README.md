# LinkedMail AI

Generate personalized cold emails from any LinkedIn profile in one click.

**Website:** [linkedmailai.com](https://www.linkedmailai.com)

---

## What it does

LinkedMail AI is a Chrome extension that scrapes a LinkedIn profile and uses GPT-4o-mini to write a personalized cold email. Users can choose the tone (Professional, Friendly, Direct, Casual) and purpose (Sales, Recruiting, Partnership, Networking) and add optional context about themselves.

Free plan: 5 emails/month. Pro plan: unlimited at $19/month via Stripe.

---

## Architecture

```
extension/          Chrome Extension (Manifest V3)
  popup.html        UI
  popup.css         Styles
  src/popup.js      Extension logic (auth, generate, upgrade)
  src/content.js    LinkedIn profile scraper (injected into linkedin.com/in/*)
  icons/            Extension icons (16, 48, 128px)
  manifest.json

backend/            Node.js API (deployed on Railway)
  server.js         Express app entry point
  routes/
    auth.js         Google OAuth sign-in, /auth/me
    email.js        POST /email/generate → OpenAI
    stripe.js       Stripe webhook (plan upgrades/cancellations)
  middleware/
    auth.js         JWT verification + monthly usage reset
  db/
    database.js     Turso (libSQL) client + schema init

docs/               Marketing website (deployed on Vercel → linkedmailai.com)
  index.html
  privacy.html
  commerce-disclosure.html
  sct.html          Japanese Specified Commercial Transactions Act disclosure
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3, vanilla JS |
| Backend | Node.js, Express |
| Database | Turso (libSQL) — US East Virginia |
| AI | OpenAI gpt-4o-mini |
| Auth | Google OAuth via `chrome.identity` + JWT (30d) |
| Payments | Stripe (Payment Link + webhooks) |
| Backend hosting | Railway (Hobby plan) |
| Website hosting | Vercel |
| Domain | linkedmailai.com (Squarespace registrar, Vercel DNS) |

---

## Local development

### Backend

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

The server starts on `http://localhost:3000`.

### Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Navigate to any `linkedin.com/in/...` profile and click the extension icon

> For local testing, change `API_BASE` in `extension/src/popup.js` to `http://localhost:3000`.

---

## Environment variables

See [`backend/.env.example`](backend/.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Long random string for signing JWTs |
| `OPENAI_API_KEY` | OpenAI API key |
| `STRIPE_SECRET_KEY` | Stripe live secret key |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard → Webhooks |
| `STRIPE_PRO_PRICE_ID` | Price ID of the $19/month Pro plan |
| `STRIPE_PAYMENT_LINK` | Stripe Payment Link URL (static, no server call needed) |
| `APP_URL` | Deployed backend URL (used in Stripe redirect pages) |
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |

---

## Database schema

Turso (libSQL) — single `users` table, created automatically on server start:

```sql
CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT,
  picture               TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free',
  usage_count           INTEGER NOT NULL DEFAULT 0,
  usage_reset_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Usage count resets automatically every month (handled in auth middleware on each request).

---

## Stripe setup

1. Create a product in Stripe Dashboard: **LinkedMail AI Pro — $19/month**
2. Copy the **Price ID** → `STRIPE_PRO_PRICE_ID`
3. Create a **Payment Link** for that product → `STRIPE_PAYMENT_LINK`
4. Add a **Webhook** endpoint: `https://your-backend.railway.app/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`
5. Copy the **Webhook signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Deployment

### Backend (Railway)

1. Connect the GitHub repo to Railway
2. Set **Root Directory** to `backend`
3. Add all environment variables from `.env.example`
4. Railway auto-deploys on every push to `main`

### Website (Vercel)

1. Connect the GitHub repo to Vercel
2. Set **Root Directory** to `docs`
3. Add custom domain `linkedmailai.com` in Vercel project settings
4. Point Squarespace nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`

---

## Publishing to Chrome Web Store

1. Zip the `extension/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer fee
4. Upload the zip, add screenshots, and submit for review

---

## Legal pages (required for Stripe Japan)

| Page | URL |
|------|-----|
| Privacy Policy | [linkedmailai.com/privacy.html](https://www.linkedmailai.com/privacy.html) |
| Commerce Disclosure | [linkedmailai.com/commerce-disclosure.html](https://www.linkedmailai.com/commerce-disclosure.html) |
| SCT (特定商取引法) | [linkedmailai.com/sct.html](https://www.linkedmailai.com/sct.html) |
