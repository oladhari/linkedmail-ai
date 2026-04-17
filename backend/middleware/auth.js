const jwt = require("jsonwebtoken");
const { db } = require("../db/database");

module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const rs = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [payload.userId] });
    const user = rs.rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });

    // Reset usage counter each month
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (user.usage_reset_at !== currentMonth) {
      await db.execute({
        sql: "UPDATE users SET usage_count = 0, usage_reset_at = ? WHERE id = ?",
        args: [currentMonth, user.id],
      });
      user.usage_count = 0;
      user.usage_reset_at = currentMonth;
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
