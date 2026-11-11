// server/routes/health.js  –  Health records (vet submits, farmer reads)
const router = require('express').Router();
const db = require('../src/db');
const admin = require('firebase-admin');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/health/record  –  Vet submits a health/treatment record for an animal
router.post('/record', async (req, res) => {
  try {
    if (req.user.role !== 'veterinary_officer') return res.status(403).json({ error: 'Only vets can submit health records' });

    const { farmId, animalId, type, description, prescription, nextDue, status } = req.body || {};
    if (!farmId || !animalId || !type) return res.status(400).json({ error: 'farmId, animalId and type are required' });

    // Confirm vet is assigned to this farm
    const assign = await db.collection('vetAssignments')
      .where('farmId', '==', farmId).where('vetId', '==', req.user.id).where('status', '==', 'active').limit(1).get();
    if (assign.empty) return res.status(403).json({ error: 'You are not assigned to this farm' });

    const record = {
      farmId,
      animalId,
      vetId: req.user.id,
      vetName: req.user.fullName || req.user.name || 'Veterinary Officer',
      type,
      description: description || '',
      prescription: prescription || '',
      nextDue: nextDue || null,
      status: status || 'Completed',
      date: new Date().toISOString().slice(0, 10),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      seenByFarmer: false
    };

    const ref = await db.collection('healthRecords').add(record);

    // Also append to farmRecords.data.healthRec so farmer's dashboard shows it immediately
    const recDoc = await db.collection('farmRecords').doc(farmId).get();
    if (recDoc.exists) {
      const existing = recDoc.data().data || {};
      const healthRec = Array.isArray(existing.healthRec) ? existing.healthRec : [];
      const id = 'HR-' + String(healthRec.length + 1).padStart(3, '0');
      healthRec.push({ id, ...record, createdAt: record.date });
      await db.collection('farmRecords').doc(farmId).update({
        'data.healthRec': healthRec,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(201).json({ ok: true, id: ref.id, message: 'Health record submitted and visible to farmer' });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/health/records?farmId=xxx  –  Farmer reads all health records for their farm
router.get('/records', async (req, res) => {
  try {
    const { farmId } = req.query;
    if (!farmId) return res.status(400).json({ error: 'farmId query param required' });

    if (req.user.role === 'farmer') {
      const farmSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
      if (farmSnap.empty || farmSnap.docs[0].id !== farmId) return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch health records without compound orderBy to avoid composite index requirement
    const snap = await db.collection('healthRecords').where('farmId', '==', farmId).get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // In-memory sort by date / createdAt descending
    records.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.date || a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.date || b.createdAt || 0).getTime();
      return tb - ta;
    });

    // Also include any historical records stored in farmRecords.data.healthRec
    try {
      const recDoc = await db.collection('farmRecords').doc(farmId).get();
      if (recDoc.exists) {
        const legacy = recDoc.data()?.data?.healthRec || [];
        const seenIds = new Set(records.map(r => r.id));
        for (const lr of legacy) {
          if (!seenIds.has(lr.id)) {
            records.push({
              ...lr,
              description: lr.description || lr.desc || '',
              vetName: lr.vetName || lr.vet || 'Veterinary Officer'
            });
          }
        }
      }
    } catch (ignore) {}

    // Mark unread records as seen by farmer in background batch
    const batch = db.batch();
    let batchCount = 0;
    snap.docs.forEach(d => {
      if (d.data().seenByFarmer === false) {
        batch.update(d.ref, { seenByFarmer: true });
        batchCount++;
      }
    });
    if (batchCount > 0) {
      await batch.commit();
    }

    res.json({ records });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/health/notifications  –  Farmer checks for new unseen vet records (badge count)
router.get('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });
    const farmSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
    if (farmSnap.empty) return res.json({ unseen: 0 });
    const farmId = farmSnap.docs[0].id;
    const snap = await db.collection('healthRecords').where('farmId', '==', farmId).where('seenByFarmer', '==', false).get();
    res.json({ unseen: snap.size });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/health/my-tasks  –  Vet sees animals assigned to them
router.get('/my-tasks', async (req, res) => {
  try {
    if (req.user.role !== 'veterinary_officer') return res.status(403).json({ error: 'Vets only' });

    const assignSnap = await db.collection('vetAssignments')
      .where('vetId', '==', req.user.id).where('status', '==', 'active').get();

    const tasks = [];
    for (const doc of assignSnap.docs) {
      const { farmId, animalIds, farmerUserId } = doc.data();
      const farmDoc = await db.collection('farms').doc(farmId).get();
      const recDoc  = await db.collection('farmRecords').doc(farmId).get();
      if (!recDoc.exists) continue;

      const animals = recDoc.data().data?.animals || [];
      const targetAnimals = animalIds.length > 0
        ? animals.filter(a => animalIds.includes(a.id))
        : animals;

      tasks.push({
        assignmentId: doc.id,
        farmId,
        farmName: farmDoc.data()?.name || farmId,
        farmerUserId,
        animals: targetAnimals
      });
    }

    res.json({ tasks });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/health/my-records  –  Vet sees all records they have submitted
router.get('/my-records', async (req, res) => {
  try {
    if (req.user.role !== 'veterinary_officer') return res.status(403).json({ error: 'Vets only' });
    const snap = await db.collection('healthRecords').where('vetId', '==', req.user.id).get();
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    records.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.date || a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.date || b.createdAt || 0).getTime();
      return tb - ta;
    });
    res.json({ records });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
