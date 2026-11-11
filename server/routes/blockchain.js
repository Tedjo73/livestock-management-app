const r = require('express').Router();
const db = require('../src/db');
const auth = require('../middleware/auth');
const admin = require('firebase-admin');
const { ethers } = require('ethers');

r.use(auth);

const abi = [
  'function anchor(bytes32 recordHash,string recordType) external returns (uint256)',
  'event RecordAnchored(address indexed submitter,bytes32 indexed recordHash,string recordType,uint256 timestamp)',
];

// POST /api/blockchain/anchor
r.post('/anchor', async (req, res, next) => {
  try {
    const { recordType, record } = req.body || {};
    if (!recordType || !record) return res.status(400).json({ error: 'recordType and record are required' });
    const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ recordType, record })));

    // Get user's farm
    const farmSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
    let farmId = !farmSnap.empty ? farmSnap.docs[0].id : 'default-farm';
    const docRef = db.collection('blockchainAnchors').doc(`${req.user.id}_${hash.slice(2)}`);
    const existing = await docRef.get();
    const saved = existing.exists ? existing.data() : null;
    if (saved && saved.status === 'confirmed') {
      return res.json({ id: docRef.id, hash, txHash: saved.txHash || null, status: saved.status, network: saved.network, duplicate: true });
    }

    let txHash = null, status = 'firestore-only', network = 'Firestore';
    if (process.env.BLOCKCHAIN_RPC_URL && process.env.BLOCKCHAIN_PRIVATE_KEY && process.env.BLOCKCHAIN_CONTRACT_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        const chain = await provider.getNetwork();
        const allowedChainId = BigInt(process.env.BLOCKCHAIN_ALLOWED_CHAIN_ID || '11155111');
        if (chain.chainId !== allowedChainId) throw new Error(`Blocked unexpected chain ID ${chain.chainId}.`);
        const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(process.env.BLOCKCHAIN_CONTRACT_ADDRESS, abi, wallet);
        const tx = await contract.anchor(hash, recordType);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        status = 'confirmed';
        network = chain.chainId === 11155111n ? 'Ethereum Sepolia' : `EVM chain ${chain.chainId}`;
      } catch (chainErr) {
        console.warn('EVM anchoring error:', chainErr.message);
        status = 'firestore-only';
      }
    }

    await docRef.set({
      farmId,
      ownerUserId: req.user.id,
      recordType,
      recordHash: hash,
      txHash,
      network,
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id, hash, txHash, status, network });
  } catch (e) { next(e); }
});

// GET /api/blockchain/anchors
r.get('/anchors', async (req, res, next) => {
  try {
    let snap;
    const farmSnap = await db.collection('farms').where('ownerUserId', '==', req.user.id).limit(1).get();
    if (!farmSnap.empty && req.user.role === 'farmer') {
      const farmId = farmSnap.docs[0].id;
      snap = await db.collection('blockchainAnchors').where('farmId', '==', farmId).get();
      if (snap.empty) {
        snap = await db.collection('blockchainAnchors').limit(50).get();
      }
    } else {
      snap = await db.collection('blockchainAnchors').limit(100).get();
    }
    const anchors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort in memory to avoid requiring composite Firestore indexes
    anchors.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0)).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0)).getTime();
      return tb - ta;
    });
    res.json({ anchors });
  } catch (e) { next(e); }
});

module.exports = r;

