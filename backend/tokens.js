const jwt = require("jsonwebtoken");

function makeToken(userId) {
  return jwt.sign({ userId: Number(userId) }, process.env.JWT_SECRET, {
    algorithm: "HS256", expiresIn: "30d",
  });
}

function verifyToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
    throw new Error("Invalid user ID");
  }
  return payload;
}

module.exports = { makeToken, verifyToken };
