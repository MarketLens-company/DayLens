const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'daylens-dev-secret-change-in-production';
const EXPIRES_IN = '30d';

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// Express middleware — attaches req.userId and req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, requireAuth };
