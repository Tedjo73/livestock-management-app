// server/routes/auth.js
const router = require('express').Router();
const db = require('../src/db');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function makeToken(user) {
  const secret = process.env.JWT_SECRET || 'c069a947f2661c455b4ccec7e83ca8db7428e3ab597300e9e4629e0067caa6fe';
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '8h' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, fullName, email, password, role } = req.body || {};
    const finalName = (name || fullName || '').trim();
    const finalEmail = (email || '').trim().toLowerCase();
    if (!finalName || !finalEmail || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const allowedRoles = ['farmer', 'veterinary_officer', 'buyer', 'security_admin'];
    const userRole = allowedRoles.includes(role) ? role : 'farmer';

    const existing = await db.collection('users').where('email', '==', finalEmail).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const ref = db.collection('users').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set({
      name: finalName,
      fullName: finalName,
      email: finalEmail,
      password: hashed,
      passwordHash: hashed,
      role: userRole,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });

    const userObj = { id: ref.id, name: finalName, email: finalEmail, role: userRole, registered: false, farm: null };
    const token = makeToken(userObj);
    res.status(201).json({ user: userObj, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const finalEmail = String(email || '').trim().toLowerCase();
    if (!finalEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const snap = await db.collection('users').where('email', '==', finalEmail).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });

    const doc = snap.docs[0];
    const u = doc.data();
    const pwdHash = u.password || u.passwordHash;
    const match = pwdHash ? await bcrypt.compare(password, pwdHash) : false;
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if farmer has registered a farm
    let farm = null;
    if (['farmer', 'farm_manager'].includes(u.role)) {
      const ownedSnap = await db.collection('farms').where('ownerUserId', '==', doc.id).limit(1).get();
      if (!ownedSnap.empty) {
        const f = ownedSnap.docs[0].data();
        farm = { id: ownedSnap.docs[0].id, name: f.farmName || f.name, district: f.district, town: f.town };
      }
    }

    const userObj = {
      id: doc.id,
      name: u.name || u.fullName || 'User',
      email: u.email,
      role: u.role || 'farmer',
      registered: !!farm,
      farm
    };

    const token = makeToken(userObj);

    // Update user's last login timestamp
    await doc.ref.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    // Audit log with rich user details for admin traceability
    await db.collection('auditLogs').add({
      userId: doc.id,
      userName: userObj.name,
      userEmail: userObj.email,
      role: userObj.role,
      farmId: farm?.id || null,
      farmName: farm?.name || null,
      action: 'LOGIN',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Browser',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ user: userObj, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const u = doc.data();

    let farm = null;
    const ownedSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
    if (!ownedSnap.empty) {
      const f = ownedSnap.docs[0].data();
      farm = { id: ownedSnap.docs[0].id, name: f.farmName || f.name, district: f.district, town: f.town };
    }

    res.json({
      user: {
        id: doc.id,
        name: u.name || u.fullName,
        email: u.email,
        role: u.role,
        registered: !!farm,
        farm
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
