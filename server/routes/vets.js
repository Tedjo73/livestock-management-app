// server/routes/vets.js  –  Vet listing and farmer-vet assignment
const router = require('express').Router();
const db = require('../src/db');
const admin = require('firebase-admin');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/vets  –  List all registered vets (farmers use this to pick a vet)
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('users').where('role', '==', 'veterinary_officer').get();
    const vets = snap.docs.map(d => ({ id: d.id, name: d.data().name, email: d.data().email }));
    res.json({ vets });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// POST /api/vets/assign  –  Farmer assigns a vet to attend their animals
// Body: { vetId, animalIds: [] }  (empty animalIds means "all animals on farm")
router.post('/assign', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can assign vets' });

    const { vetId, animalIds } = req.body || {};
    if (!vetId) return res.status(400).json({ error: 'vetId is required' });

    const vetDoc = await db.collection('users').doc(vetId).get();
    if (!vetDoc.exists || vetDoc.data().role !== 'veterinary_officer') {
      return res.status(404).json({ error: 'Vet not found' });
    }

    const farmSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
    if (farmSnap.empty) return res.status(400).json({ error: 'Register a farm first' });
    const farmId = farmSnap.docs[0].id;

    const existSnap = await db.collection('vetAssignments')
      .where('farmId', '==', farmId).where('vetId', '==', vetId).limit(1).get();

    const assignData = {
      farmId, vetId,
      farmerUserId: req.user.id,
      vetName: vetDoc.data().name,
      animalIds: Array.isArray(animalIds) ? animalIds : [],
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };

    if (!existSnap.empty) {
      await existSnap.docs[0].ref.update(assignData);
    } else {
      await db.collection('vetAssignments').add(assignData);
    }

    res.json({ ok: true, message: `Dr. ${vetDoc.data().name} assigned successfully` });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/vets/assignments  –  Farmer views their active vet assignments
router.get('/assignments', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can view their assignments' });
    const snap = await db.collection('vetAssignments').where('farmerUserId', '==', req.user.id).get();
    const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ assignments });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// DELETE /api/vets/assign/:id  –  Farmer removes a vet assignment
router.delete('/assign/:id', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can remove assignments' });
    await db.collection('vetAssignments').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
