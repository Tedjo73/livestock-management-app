// server/routes/security.js  –  Enterprise Administration & Cybersecurity Audit
const router = require('express').Router();
const db = require('../src/db');
const auth = require('../middleware/auth');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

router.use(auth);

// Helper: Require admin privileges
function requireAdmin(req, res, next) {
  if (!['security_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

// GET /api/security/stats  –  System-wide statistics for Admin Overview
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [usersSnap, farmsSnap, listingsSnap, auditSnap, farmRecordsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('farms').get(),
      db.collection('marketplaceListings').get(),
      db.collection('auditLogs').get(),
      db.collection('farmRecords').get()
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const roleCounts = {
      farmer: users.filter(u => u.role === 'farmer').length,
      veterinary_officer: users.filter(u => u.role === 'veterinary_officer').length,
      buyer: users.filter(u => u.role === 'buyer').length,
      admin: users.filter(u => ['security_admin', 'admin'].includes(u.role)).length,
      total: users.length
    };

    let totalAnimals = 0;
    let totalSalesRevenue = 0;
    let totalSalesCount = 0;

    farmRecordsSnap.docs.forEach(doc => {
      const data = doc.data().data || {};
      if (Array.isArray(data.animals)) totalAnimals += data.animals.length;
      if (Array.isArray(data.salesRec)) {
        totalSalesCount += data.salesRec.length;
        totalSalesRevenue += data.salesRec.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      }
    });

    res.json({
      users: roleCounts,
      farmsCount: farmsSnap.size,
      totalAnimals,
      totalListings: listingsSnap.size,
      totalSalesCount,
      totalSalesRevenue,
      auditEventsCount: auditSnap.size
    });
  } catch (e) { next(e); }
});

// GET /api/security/users  –  List all accounts with enriched metadata
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const [usersSnap, farmsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('farms').get()
    ]);

    const farmMap = {};
    farmsSnap.docs.forEach(d => {
      const f = d.data();
      if (f.ownerUserId) farmMap[f.ownerUserId] = { id: d.id, name: f.farmName || f.name, district: f.district };
    });

    const users = usersSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || data.fullName || 'User',
        email: data.email,
        role: data.role || 'farmer',
        isActive: data.isActive !== false,
        district: data.district || farmMap[d.id]?.district || '—',
        farm: farmMap[d.id] || null,
        lastLoginAt: data.lastLoginAt || null,
        createdAt: data.createdAt || null
      };
    });

    // In-memory sort by createdAt desc
    users.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    res.json({ users });
  } catch (e) { next(e); }
});

// PATCH /api/security/users/:id/role  –  Change user role
router.patch('/users/:id/role', requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['farmer', 'veterinary_officer', 'buyer', 'security_admin'];
    const { role } = req.body;
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const targetDoc = await db.collection('users').doc(req.params.id).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });
    const oldRole = targetDoc.data().role;

    await db.collection('users').doc(req.params.id).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('auditLogs').add({
      userId: req.user.id,
      userName: req.user.name || req.user.fullName || 'Admin',
      userEmail: req.user.email,
      role: req.user.role,
      action: 'ROLE_CHANGED',
      entityType: 'user',
      entityRef: req.params.id,
      targetUserEmail: targetDoc.data().email,
      details: { fromRole: oldRole, toRole: role },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ ok: true, message: `Role updated from ${oldRole} to ${role}` });
  } catch (e) { next(e); }
});

// PATCH /api/security/users/:id/status  –  Activate / Suspend account
router.patch('/users/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive boolean required' });

    const targetDoc = await db.collection('users').doc(req.params.id).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });

    await db.collection('users').doc(req.params.id).update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const action = isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_SUSPENDED';
    await db.collection('auditLogs').add({
      userId: req.user.id,
      userName: req.user.name || req.user.fullName || 'Admin',
      userEmail: req.user.email,
      role: req.user.role,
      action,
      entityType: 'user',
      entityRef: req.params.id,
      targetUserEmail: targetDoc.data().email,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ ok: true, message: `Account ${isActive ? 'activated' : 'suspended'}` });
  } catch (e) { next(e); }
});

// POST /api/security/users/:id/reset-password  –  Admin resets a user password
router.post('/users/:id/reset-password', requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const finalPassword = (newPassword || 'Password123!').trim();
    if (finalPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const targetDoc = await db.collection('users').doc(req.params.id).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(finalPassword, 12);
    await db.collection('users').doc(req.params.id).update({
      password: hashed,
      passwordHash: hashed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('auditLogs').add({
      userId: req.user.id,
      userName: req.user.name || req.user.fullName || 'Admin',
      userEmail: req.user.email,
      role: req.user.role,
      action: 'PASSWORD_RESET_BY_ADMIN',
      entityType: 'user',
      entityRef: req.params.id,
      targetUserEmail: targetDoc.data().email,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (e) { next(e); }
});

// DELETE /api/security/users/:id  –  Delete an account
router.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own active administrative account' });
    }

    const targetDoc = await db.collection('users').doc(req.params.id).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'User not found' });
    const targetEmail = targetDoc.data().email;

    await db.collection('users').doc(req.params.id).delete();

    await db.collection('auditLogs').add({
      userId: req.user.id,
      userName: req.user.name || req.user.fullName || 'Admin',
      userEmail: req.user.email,
      role: req.user.role,
      action: 'ACCOUNT_DELETED_BY_ADMIN',
      entityType: 'user',
      entityRef: req.params.id,
      targetUserEmail: targetEmail,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ ok: true, message: 'Account deleted' });
  } catch (e) { next(e); }
});

// GET /api/security/audit-logs  –  Comprehensive Audit Logs with login times & actors
router.get('/audit-logs', async (req, res, next) => {
  try {
    const snap = await db.collection('auditLogs').limit(300).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // In-memory sort by createdAt descending
    logs.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    res.json({ logs });
  } catch (e) { next(e); }
});

// GET /api/security/farms  –  List registered farms and herds
router.get('/farms', requireAdmin, async (req, res, next) => {
  try {
    const [farmsSnap, recordsSnap, usersSnap] = await Promise.all([
      db.collection('farms').get(),
      db.collection('farmRecords').get(),
      db.collection('users').get()
    ]);

    const userMap = {};
    usersSnap.docs.forEach(d => userMap[d.id] = d.data().name || d.data().fullName || d.data().email);

    const recordMap = {};
    recordsSnap.docs.forEach(d => {
      const r = d.data().data || {};
      recordMap[d.id] = {
        animalsCount: (r.animals || []).length,
        salesCount: (r.salesRec || []).length,
        healthCount: (r.healthRec || []).length
      };
    });

    const farms = farmsSnap.docs.map(d => {
      const f = d.data();
      const stats = recordMap[d.id] || { animalsCount: f.approximateHerd || 0, salesCount: 0, healthCount: 0 };
      return {
        id: d.id,
        name: f.farmName || f.name,
        district: f.district,
        town: f.town || '—',
        ownerName: userMap[f.ownerUserId] || 'Farmer',
        ownerUserId: f.ownerUserId,
        sizeHa: f.sizeHa || 0,
        mainSpecies: f.mainSpecies || 'Livestock',
        ...stats,
        createdAt: f.createdAt || null
      };
    });

    res.json({ farms });
  } catch (e) { next(e); }
});

module.exports = router;
