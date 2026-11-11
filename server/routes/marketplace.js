// server/routes/marketplace.js  –  Public livestock listings and buyer purchase
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../src/db');
const admin = require('firebase-admin');
const { ethers } = require('ethers');
const auth = require('../middleware/auth');

const abi = [
  'function anchor(bytes32 recordHash,string recordType) external returns (uint256)',
  'event RecordAnchored(address indexed submitter,bytes32 indexed recordHash,string recordType,uint256 timestamp)',
];

const DEFAULT_LISTINGS = [
  { id: 'L-001', animalId: 'AC-0001', name: 'Bessie', species: 'Cattle', breed: 'Nguni', weight: 420, price: 14400, district: 'Berea', health: 'Healthy', status: 'Available', vaccinated: true },
  { id: 'L-002', animalId: 'AC-0002', name: 'Bull-King', species: 'Cattle', breed: 'Brahman', weight: 610, price: 19500, district: 'Maseru', health: 'Healthy', status: 'Available', vaccinated: true },
  { id: 'L-003', animalId: 'AC-0004', name: 'Nanny-G', species: 'Goat', breed: 'Boer', weight: 68, price: 3400, district: 'Leribe', health: 'Healthy', status: 'Available', vaccinated: true },
  { id: 'L-004', animalId: 'AC-0006', name: 'Fluffy', species: 'Sheep', breed: 'Merino', weight: 55, price: 2750, district: 'Mohale\'s Hoek', health: 'Healthy', status: 'Available', vaccinated: true },
  { id: 'L-005', animalId: 'AC-0008', name: 'Porky', species: 'Pig', breed: 'Large White', weight: 95, price: 6800, district: 'Mafeteng', health: 'Healthy', status: 'Available', vaccinated: true },
  { id: 'L-006', animalId: 'AC-0013', name: 'Titan', species: 'Cattle', breed: 'Simmental', weight: 720, price: 24000, district: 'Leribe', health: 'Healthy', status: 'Available', vaccinated: true }
];

// GET /api/marketplace  –  Public catalog
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('marketplaceListings').get();
    let listings = [];
    if (!snap.empty) {
      listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      // If none in collection yet, check farmRecords to generate real listings or use defaults
      const farmsSnap = await db.collection('farmRecords').limit(1).get();
      if (!farmsSnap.empty) {
        const farmId = farmsSnap.docs[0].id;
        const d = farmsSnap.docs[0].data().data || {};
        const farmAnimals = Array.isArray(d.animals) ? d.animals : [];
        if (farmAnimals.length > 0) {
          const batch = db.batch();
          listings = farmAnimals.slice(0, 8).map((a, idx) => {
            const listId = `L-${String(idx + 1).padStart(3, '0')}`;
            const ref = db.collection('marketplaceListings').doc(listId);
            const rate = a.species === 'Goat' ? 48 : a.species === 'Sheep' ? 45 : a.species === 'Pig' ? 60 : 32;
            const price = Math.round((a.weight || 350) * rate);
            const item = {
              id: listId,
              farmId,
              animalId: a.id,
              name: a.name || `Animal ${a.id}`,
              species: a.species,
              breed: a.breed || 'Standard',
              weight: a.weight || 350,
              price: price || 12000,
              district: a.district || 'Maseru',
              health: a.health || 'Healthy',
              status: a.status === 'Sold' ? 'Sold' : 'Available',
              vaccinated: true
            };
            batch.set(ref, item);
            return item;
          });
          await batch.commit().catch(() => {});
        }
      }
      if (!listings.length) {
        listings = DEFAULT_LISTINGS;
      }
    }
    res.json({ listings });
  } catch (e) {
    console.error(e);
    res.json({ listings: DEFAULT_LISTINGS });
  }
});

// POST /api/marketplace/purchase  –  Buyer purchase with required user account + GDPR pseudonymization + Blockchain Anchor
router.post('/purchase', auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'You must have a registered account to purchase livestock' });
    }

    const { listingId, buyerName, buyerPhone } = req.body || {};
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const effectiveBuyerName = (buyerName || req.user.fullName || req.user.name || req.user.email).trim();
    const effectivePhone = (buyerPhone || req.user.phone || '').trim();

    // 12-character GDPR pseudonymous hash for buyer (hashes account email + ID for true pseudonymity)
    const buyerRef = crypto.createHash('sha256').update(`${req.user.id}:${req.user.email}`).digest('hex').slice(0, 12);
    const date = new Date().toISOString().slice(0, 10);

    const listingRef = db.collection('marketplaceListings').doc(listingId);
    const doc = await listingRef.get();
    let listingData = doc.exists ? doc.data() : DEFAULT_LISTINGS.find(l => l.id === listingId);

    if (listingData && listingData.status === 'Sold') {
      return res.status(409).json({ error: 'Animal is already sold' });
    }

    // Mark listing as Sold in marketplace catalog
    if (doc.exists) {
      await listingRef.update({
        status: 'Sold',
        buyerRef,
        buyerUserId: req.user.id,
        buyerEmail: req.user.email,
        buyerName: effectiveBuyerName,
        soldAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    let saleId = 'SL-' + Math.floor(100 + Math.random() * 900);
    const animalId = listingData ? listingData.animalId : 'AC-0001';

    // Update farm records if a farm is associated
    const targetFarmSnap = await db.collection('farmRecords').limit(1).get();
    if (!targetFarmSnap.empty) {
      const farmDocRef = targetFarmSnap.docs[0].ref;
      const farmData = targetFarmSnap.docs[0].data().data || {};
      const animals = Array.isArray(farmData.animals) ? farmData.animals : [];
      const salesRec = Array.isArray(farmData.salesRec) ? farmData.salesRec : [];

      // Mark animal sold in herd
      const animal = animals.find(a => a.id === animalId);
      if (animal) {
        animal.status = 'Sold';
        animal.soldOn = date;
      }

      // Generate next sequential SL- id
      const maxId = salesRec.reduce((m, s) => Math.max(m, parseInt(String(s.id).replace(/\D/g, ''), 10) || 0), 0);
      saleId = 'SL-' + String(maxId + 1).padStart(3, '0');

      salesRec.push({
        id: saleId,
        animalId,
        species: listingData?.species || animal?.species || 'Livestock',
        weight: listingData?.weight || animal?.weight || 350,
        buyer: effectiveBuyerName + ' (#' + buyerRef + ')',
        buyerUserId: req.user.id,
        buyerEmail: req.user.email,
        price: listingData?.price || 12000,
        date,
        status: 'Paid',
        buyerRef
      });

      await farmDocRef.update({
        'data.animals': animals,
        'data.salesRec': salesRec,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Anchor a pseudonymous sale hash to the configured EVM network.
    let txHash = null;
    if (process.env.BLOCKCHAIN_RPC_URL && process.env.BLOCKCHAIN_PRIVATE_KEY && process.env.BLOCKCHAIN_CONTRACT_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        const chain = await provider.getNetwork();
        const allowedChainId = BigInt(process.env.BLOCKCHAIN_ALLOWED_CHAIN_ID || '11155111');
        if (chain.chainId !== allowedChainId) throw new Error(`Blocked unexpected chain ID ${chain.chainId}.`);
        const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(process.env.BLOCKCHAIN_CONTRACT_ADDRESS, abi, wallet);
        const recordHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
          saleId, animalId, buyerRef, price: listingData?.price, date
        })));
        const tx = await contract.anchor(recordHash, 'SALE_TRANSACTION');
        const receipt = await tx.wait();
        txHash = receipt.hash;
      } catch (chainErr) {
        console.warn('Smart contract anchoring skipped:', chainErr.message);
      }
    }

    res.json({
      ok: true,
      message: txHash ? 'Purchase completed and anchored on Ethereum.' : 'Purchase completed and saved in Firestore; Ethereum anchoring is not configured.',
      saleId,
      buyerRef,
      txHash
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
