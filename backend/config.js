const REQUIRED_PRODUCTION_VALUES = [
  "OPENAI_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID", "APP_URL", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN",
];

function validateEnvironment(env = process.env) {
  const secret = env.JWT_SECRET || "";
  if (secret.length < 32 || /replace_with|random_string|change.?me/i.test(secret)) {
    throw new Error("JWT_SECRET must be a fresh random secret of at least 32 characters");
  }
  if (env.NODE_ENV === "production") {
    for (const name of REQUIRED_PRODUCTION_VALUES) {
      const value = env[name] || "";
      if (!value.trim() || /\.\.\.|your-|replace_with/.test(value)) {
        throw new Error(`Missing or placeholder production configuration: ${name}`);
      }
    }
    if (!env.TURSO_DATABASE_URL.startsWith("libsql://")) {
      throw new Error("Production requires a remote Turso database");
    }
    const appUrl = new URL(env.APP_URL);
    if (appUrl.protocol !== "https:" || appUrl.username || appUrl.password) {
      throw new Error("Production APP_URL must use HTTPS without credentials");
    }
  }
}

module.exports = { validateEnvironment };
