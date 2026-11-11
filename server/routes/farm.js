// server/routes/farm.js  –  CRUD for farmer's herd data
const router = require('express').Router();
const db = require('../src/db');
const admin = require('firebase-admin');
const auth = require('../middleware/auth');

router.use(auth);

// Helper: get farmId for the authenticated farmer
async function getFarmId(userId) {
  const snap = await db.collection('farms').where('ownerUserId', '==', userId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// POST /api/farm/register  –  first-time farm setup
router.post('/register', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can register a farm' });
    const { name, district, town, sizeHa } = req.body || {};
    if (!name || !district || !town || !Number(sizeHa)) return res.status(400).json({ error: 'Name, district, town and size are required' });

    const farmRef = db.collection('farms').doc();
    await farmRef.set({ ownerUserId: req.user.id, name, district, town, sizeHa: Number(sizeHa), createdAt: admin.firestore.FieldValue.serverTimestamp() });
    // Create empty records doc
    await db.collection('farmRecords').doc(farmRef.id).set({ farmId: farmRef.id, updatedBy: req.user.id, updatedAt: admin.firestore.FieldValue.serverTimestamp(), data: { animals: [], healthRec: [], salesRec: [], breedRec: [], feedRec: [] } });
    res.status(201).json({ ok: true, farmId: farmRef.id });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/farm/data
router.get('/data', async (req, res) => {
  try {
    let farmId = null;
    if (req.user.role === 'farmer') {
      farmId = await getFarmId(req.user.id);
    } else if (req.user.role === 'veterinary_officer') {
      // Vets can read data for farms they're assigned to
      const assign = await db.collection('vetAssignments').where('vetId', '==', req.user.id).limit(1).get();
      if (!assign.empty) farmId = assign.docs[0].data().farmId;
    }
    // Fallback for admin, auditor, or buyer: load primary farm records for sync & audit
    if (!farmId && ['security_admin', 'admin', 'buyer'].includes(req.user.role)) {
      const allFarms = await db.collection('farms').limit(1).get();
      if (!allFarms.empty) farmId = allFarms.docs[0].id;
    }
    if (!farmId) return res.json({ data: null, farm: null });

    const farmDoc = await db.collection('farms').doc(farmId).get();
    const recDoc = await db.collection('farmRecords').doc(farmId).get();
    const data = recDoc.exists ? recDoc.data().data : { animals: [], healthRec: [], salesRec: [], breedRec: [], feedRec: [] };
    res.json({ farm: { id: farmId, ...farmDoc.data() }, data });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// PUT /api/farm/data
router.put('/data', async (req, res) => {
  try {
    if (!['farmer'].includes(req.user.role)) return res.status(403).json({ error: 'Only farmers can update farm data' });
    const farmId = await getFarmId(req.user.id);
    if (!farmId) return res.status(400).json({ error: 'Register a farm first' });

    const d = req.body?.data;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return res.status(400).json({ error: 'Valid data object required' });

    const safe = {
      animals: Array.isArray(d.animals) ? d.animals : [],
      healthRec: Array.isArray(d.healthRec) ? d.healthRec : [],
      salesRec: Array.isArray(d.salesRec) ? d.salesRec : [],
      breedRec: Array.isArray(d.breedRec) ? d.breedRec : [],
      feedRec: Array.isArray(d.feedRec) ? d.feedRec : [],
    };

    await db.collection('farmRecords').doc(farmId).set({ farmId, data: safe, updatedBy: req.user.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/farm/export  –  GDPR Art. 20 (Right to Data Portability)
router.get('/export', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    delete userData.password;
    delete userData.passwordHash;

    const farmId = await getFarmId(req.user.id);
    let farm = null;
    let records = null;
    if (farmId) {
      const farmDoc = await db.collection('farms').doc(farmId).get();
      farm = farmDoc.exists ? { id: farmDoc.id, ...farmDoc.data() } : null;
      const recDoc = await db.collection('farmRecords').doc(farmId).get();
      records = recDoc.exists ? recDoc.data().data : null;
    }

    let anchors = [];
    try {
      const anchorsSnap = await db.collection('blockchainAnchors')
        .where('ownerUserId', '==', req.user.id)
        .limit(100)
        .get();
      anchors = anchorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {}

    res.json({
      legalNotice: 'Exported under GDPR Article 20 / Lesotho Data Protection Act 2011 (Right to Data Portability)',
      exportedAt: new Date().toISOString(),
      user: { id: req.user.id, ...userData },
      farm,
      records: records || { animals: [], healthRec: [], salesRec: [], breedRec: [], feedRec: [] },
      blockchainAnchors: anchors
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/farm/account  –  GDPR Art. 17 (Right to Erasure)
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user.id;
    if (['security_admin', 'admin'].includes(req.user.role)) {
      return res.status(400).json({ error: 'Administrative accounts cannot be self-deleted.' });
    }

    const farmId = await getFarmId(userId);
    if (farmId) {
      await db.collection('farmRecords').doc(farmId).delete().catch(() => {});
      await db.collection('farms').doc(farmId).delete().catch(() => {});
    }

    await db.collection('users').doc(userId).delete();

    await db.collection('auditLogs').add({
      userId,
      userEmail: req.user.email,
      userName: req.user.name || 'User',
      role: req.user.role,
      action: 'ACCOUNT_DELETED_GDPR_ART17',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    res.json({ ok: true, message: 'Account permanently erased per GDPR Article 17' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

