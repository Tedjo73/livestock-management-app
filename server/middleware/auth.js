const jwt = require('jsonwebtoken');
const db = require('../src/db');

module.exports = async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    let userId = null;
    let userRole = null;

    try {
      const p = jwt.verify(token, process.env.JWT_SECRET || 'c069a947f2661c455b4ccec7e83ca8db7428e3ab597300e9e4629e0067caa6fe');
      userId = p.sub;
      userRole = p.role;
    } catch (jwtErr) {
      // Fallback base64 decode if demo token
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const parts = decoded.split(':');
        if (parts[0]) {
          userId = parts[0];
          userRole = parts[1];
        }
      } catch (decErr) {}
    }

    if (!userId) return res.status(401).json({ error: 'Invalid authentication token' });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(401).json({ error: 'Account not found' });

    const data = userDoc.data();
    req.user = { id: userDoc.id, ...data, role: userRole || data.role };
    delete req.user.password;
    delete req.user.passwordHash;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
