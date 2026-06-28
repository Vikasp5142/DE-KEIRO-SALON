const crypto = require('crypto');

/**
 * requireAdminKey middleware
 * ─────────────────────────
 * Protects admin routes with a shared secret sent in the x-admin-key header.
 *
 * Usage: set ADMIN_KEY=<long-random-secret> in your .env
 *
 * Example request (Postman / curl):
 *   curl -H "x-admin-key: your_secret_here" https://your-api.com/api/bookings
 *
 * Production upgrade path:
 *   Replace this with proper JWT auth (jsonwebtoken) if you later
 *   want multiple staff accounts with individual logins.
 */
module.exports = function requireAdminKey(req, res, next) {
  const key       = req.header('x-admin-key');
  const adminKey  = process.env.ADMIN_KEY;

  if (!adminKey) {
    // In development this is a warning, not a hard block,
    // so you can test without setting the key.
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: ADMIN_KEY is not set — blocking all admin requests.');
      return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
    }
    console.warn('⚠️  ADMIN_KEY not set — admin routes are UNPROTECTED (dev mode only).');
    return next();
  }

  if (!key) {
    return res.status(401).json({ success: false, message: 'Admin key required (x-admin-key header).' });
  }

  // Timing-safe comparison prevents timing attacks
  let match = false;
  try {
    const a = Buffer.from(key.padEnd(adminKey.length), 'utf8');
    const b = Buffer.from(adminKey, 'utf8');
    if (a.length === b.length) {
      match = crypto.timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid admin key.' });
  }

  return next();
};