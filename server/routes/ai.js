const router = require('express').Router();
const admin = require('firebase-admin');
const db = require('../src/db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/imports', async (req, res, next) => {
  try {
    const doc = await db.collection('aiDatasetImports').doc(req.user.id).get();
    res.json({ rows: doc.exists && Array.isArray(doc.data().rows) ? doc.data().rows : [] });
  } catch (error) { next(error); }
});

router.put('/imports', async (req, res, next) => {
  try {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length > 2000) {
      return res.status(400).json({ error: 'Provide an array of no more than 2,000 imported rows.' });
    }
    if (Buffer.byteLength(JSON.stringify(rows), 'utf8') > 750 * 1024) {
      return res.status(413).json({ error: 'Imported dataset is too large for one Firestore record.' });
    }
    await db.collection('aiDatasetImports').doc(req.user.id).set({
      ownerUserId: req.user.id,
      rows,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true, count: rows.length });
  } catch (error) { next(error); }
});

router.delete('/imports', async (req, res, next) => {
  try {
    await db.collection('aiDatasetImports').doc(req.user.id).delete();
    res.json({ ok: true });
  } catch (error) { next(error); }
});

module.exports = router;
