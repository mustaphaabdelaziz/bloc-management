// middleware/jwtAuth.js
// Lightweight JWT authentication middleware for API endpoints
const jwt = require('jsonwebtoken');

module.exports = function jwtAuth(secret) {
  if (!secret) throw new Error('JWT secret required');
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    const token = auth.split(' ')[1];
    try {
      const payload = jwt.verify(token, secret);
      if (!payload || !payload.sub) return res.status(401).json({ error: 'Token invalide' });
      // Minimal user object on req for downstream RBAC checks
      req.user = { _id: payload.sub, privileges: payload.privileges || [], email: payload.email };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  };
};
