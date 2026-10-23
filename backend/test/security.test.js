const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { validateEnvironment } = require('../config');
const { makeToken, verifyToken } = require('../tokens');

const production = {
  NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64),
  OPENAI_API_KEY: 'test-key', STRIPE_SECRET_KEY: 'test-key',
  STRIPE_WEBHOOK_SECRET: 'test-secret', STRIPE_PRO_PRICE_ID: 'price_test',
  APP_URL: 'https://example.com', TURSO_DATABASE_URL: 'libsql://example.turso.io',
  TURSO_AUTH_TOKEN: 'test-token',
};

test('startup rejects missing, weak, and placeholder signing secrets', () => {
  for (const JWT_SECRET of ['', 'short', 'replace_with_long_random_string']) {
    assert.throws(() => validateEnvironment({ JWT_SECRET }), /JWT_SECRET/);
  }
});

test('production requires complete configuration without leaking values', () => {
  assert.doesNotThrow(() => validateEnvironment(production));
  for (const name of Object.keys(production).filter(n => !['NODE_ENV', 'JWT_SECRET'].includes(n))) {
    const env = { ...production, [name]: '' };
    assert.throws(() => validateEnvironment(env), new RegExp(name));
  }
  assert.throws(() => validateEnvironment({ ...production, TURSO_DATABASE_URL: 'file:local.db' }), /remote Turso/);
  assert.throws(() => validateEnvironment({ ...production, APP_URL: 'http://example.com' }), /HTTPS/);
  assert.throws(() => validateEnvironment({ ...production, OPENAI_API_KEY: 'sk-...' }), /OPENAI_API_KEY/);
});

test('JWT rotation invalidates old sessions and fresh sign-in works', () => {
  const original = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'a'.repeat(64);
    const oldToken = makeToken(7);
    assert.equal(verifyToken(oldToken).userId, 7);
    process.env.JWT_SECRET = 'b'.repeat(64);
    assert.throws(() => verifyToken(oldToken));
    assert.equal(verifyToken(makeToken(7)).userId, 7);
    const unexpectedAlgorithm = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { algorithm: 'HS384' });
    assert.throws(() => verifyToken(unexpectedAlgorithm));
    assert.throws(() => verifyToken(makeToken(-1)), /Invalid user ID/);
  } finally {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  }
});
