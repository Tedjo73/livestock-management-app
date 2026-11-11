
'use strict';

/* =========================================================
   AGRICHAIN BLOCKCHAIN
   Ethereum record anchors | Firestore-backed record index
========================================================= */

/* =========================================================
   BLOCK CLASS
========================================================= */

class Block {
  constructor(index, timestamp, data, previousHash = '0'.repeat(64)) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
  }

  static fromJSON(data) {
    const block = new Block(
      data.index,
      data.timestamp,
      data.data,
      data.previousHash
    );

    block.nonce = data.nonce;
    block.hash = data.hash;

    return block;
  }

  async calculateHash() {
    const content =
      this.index +
      this.timestamp +
      JSON.stringify(this.data) +
      this.previousHash +
      this.nonce;

    return sha256(content);
  }

  async mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);

    this.hash = await this.calculateHash();

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = await this.calculateHash();
    }

    return this.hash;
  }
}

/* =========================================================
   BLOCKCHAIN CLASS
========================================================= */

class Blockchain {
  constructor(difficulty = 2) {
    this.chain = [];
    this.difficulty = difficulty;
    this.key = null;
    this.pending = [];
    this._queue = Promise.resolve();
    this._tampered = false;
    this.loadedValid = true;
  }

  save() {
    // Durable records are stored by the server in Firestore and anchored on Ethereum.
    // This in-memory view is temporary and is rebuilt from server anchors after reload.
  }

  async init() {
    const user = AG.currentUser();

    const genesis = new Block(
      0,
      new Date().toISOString(),
      {
        type: 'GENESIS',
        message: 'AgriChain Ledger Initialized',
        farmId: user
          ? 'FARM-' + (await sha256(user.email))
            .slice(0, 10).toUpperCase()
          : 'FARM-GUEST'
      }
    );

    await genesis.mineBlock(this.difficulty);

    this.chain.push(genesis);
  }

  addBlock(data, notify = true) {
    const run = async () => {
      const previousBlock = this.chain[this.chain.length - 1];

      const block = new Block(
        this.chain.length,
        new Date().toISOString(),
        data,
        previousBlock.hash
      );

      await block.mineBlock(this.difficulty);

      this.chain.push(block);

      this.save();

      if (notify) renderChain();

      return block;
    };

    const promise = this._queue.then(run, run);

    this._queue = promise.catch(() => { });

    return promise;
  }

  async isChainValid() {
    if (!this.chain.length) return false;

    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];

      if (!current || !current.data) return false;

      const calculatedHash = await current.calculateHash();

      if (current.hash !== calculatedHash) {
        return false;
      }

      if (!current.hash.startsWith('0'.repeat(this.difficulty))) {
        return false;
      }

      if (i === 0) {
        if (current.previousHash !== '0'.repeat(64)) {
          return false;
        }
      } else {
        const previous = this.chain[i - 1];

        if (current.index !== i) return false;

        if (current.previousHash !== previous.hash) {
          return false;
        }
      }
    }

    return true;
  }
}

/* =========================================================
   BLOCKCHAIN INSTANCE
========================================================= */

const agriChain = new Blockchain(2);

async function ensureChain() {
  if (!agriChain.ready) {
    agriChain.ready = agriChain.init();
  }

  return agriChain.ready;
}

/* =========================================================
   ADD BLOCKCHAIN RECORD
========================================================= */

async function addBlockchainRecord(data) {
  showMiningStatus(true, data.type);

  try {
    if (typeof AG.auditBlockchain !== 'function') throw new Error('The server anchoring service is unavailable.');
    const anchor = await AG.auditBlockchain(data.type || 'LIVESTOCK_RECORD', data);
    if (anchor.status !== 'confirmed') throw new Error('The record was not confirmed on Ethereum. Check the Sepolia server settings and wallet balance.');
    if (typeof loadSmartContractAnchors === 'function') await loadSmartContractAnchors();
    return anchor;

  } finally {
    showMiningStatus(false);
  }
}

/* =========================================================
   BLOCK COLOURS AND ICONS
========================================================= */

function blockTypeColor(type) {
  const colors = {
    GENESIS: 'var(--green-400)',
    ANIMAL_REGISTRATION: 'var(--blue-400)',
    HEALTH_EVENT: 'var(--amber-400)',
    SALE_TRANSACTION: 'var(--green-400)',
    BREEDING_RECORD: 'var(--purple-400)',
    FEED_LOGGED: 'var(--amber-500, #f59e0b)',
    FARMER_REGISTRATION: 'var(--cyan-400, #22d3ee)',
    ANIMAL_REMOVED: 'var(--red-400)'
  };

  return colors[type] || 'var(--text-muted)';
}

function blockTypeIcon(type) {
  const icons = {
    GENESIS: '⛓️',
    ANIMAL_REGISTRATION: '🐄',
    HEALTH_EVENT: '🩺',
    SALE_TRANSACTION: '💰',
    BREEDING_RECORD: '🐣',
    FEED_LOGGED: '🌾',
    FARMER_REGISTRATION: '👤',
    ANIMAL_REMOVED: '📦'
  };

  return icons[type] || '📋';
}

let activeBlockchainView = 'blocks'; // 'blocks' or 'anchors'

function toggleBlockchainView() {
  const blocksContainer = document.getElementById('chain-container');
  const anchorsContainer = document.getElementById('anchors-container');
  const toggleBtn = document.getElementById('view-mode-toggle');
  const cardTitle = document.getElementById('records-card-title');

  if (activeBlockchainView === 'blocks') {
    activeBlockchainView = 'anchors';
    if (blocksContainer) blocksContainer.style.display = 'none';
    if (anchorsContainer) anchorsContainer.style.display = 'block';
    if (toggleBtn) toggleBtn.textContent = '⛓ View Local Blocks';
    if (cardTitle) cardTitle.textContent = '🌐 Smart Contract On-Chain Anchors (Live EVM)';
    renderSmartContractAnchors();
  } else {
    activeBlockchainView = 'blocks';
    if (blocksContainer) blocksContainer.style.display = 'block';
    if (anchorsContainer) anchorsContainer.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = '🌐 View On-Chain Anchors';
    if (cardTitle) cardTitle.textContent = '⛓️ Blockchain Records & Blocks';
    renderChain();
  }
}

async function renderSmartContractAnchors() {
  const container = document.getElementById('anchors-container');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-secondary);">Loading verified on-chain anchors...</div>';

  try {
    const anchors = typeof AG.getBlockchainAnchors === 'function' ? await AG.getBlockchainAnchors() : [];

    if (!anchors || !anchors.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px 16px;">
          <div style="font-size:36px; margin-bottom:10px;">🌐</div>
          <h3 style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">No Smart Contract Anchors Found Yet</h3>
          <p style="font-size:13px; color:var(--text-secondary); max-width:480px; margin:0 auto 16px;">
            Click <strong>"Sync All Farm Records"</strong> above or add a new record to anchor cryptographic hashes directly into the live Ethereum smart contract.
          </p>
          <button class="btn btn-primary btn-sm" onclick="syncAllFarmRecords()">⚡ Sync Farm Records to Contract</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom:14px; font-size:13px; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center;">
        <span>Showing <strong>${anchors.length}</strong> confirmed on-chain transactions</span>
        <span class="badge badge-green">Network: Ethereum Sepolia</span>
      </div>
    ` + anchors.map((a, idx) => `
      <div class="block-card valid" style="border-left:3px solid var(--green-400); padding:16px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>⚡ Anchor #${anchors.length - idx}: ${blockTypeIcon(a.recordType)} ${a.recordType}</strong>
          <span class="badge badge-green">${a.status || 'confirmed'}</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          <strong>Date:</strong> ${a.createdAt ? (a.createdAt._seconds ? new Date(a.createdAt._seconds * 1000).toLocaleString() : new Date(a.createdAt).toLocaleString()) : 'Just now'}
          &nbsp;·&nbsp;
          <strong>Network:</strong> ${a.network || 'Ethereum Sepolia'}
        </div>
        <div style="margin-bottom:6px;">
          <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Transaction Hash (TxHash):</span>
          <div><code style="font-size:11.5px; word-break:break-all; color:var(--text-accent);">${a.txHash || 'Pending confirmation'}</code></div>
        </div>
        <div style="margin-bottom:6px;">
          <span style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Record Hash (Keccak-256):</span>
          <div><code style="font-size:11px; word-break:break-all; color:var(--text-secondary);">${a.recordHash || 'N/A'}</code></div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load anchors:', err);
    container.innerHTML = '<div style="text-align:center; padding:24px; color:var(--red-400);">Could not load on-chain anchors.</div>';
  }
}

async function syncAllFarmRecords() {
  const btn = document.getElementById('sync-farm-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Syncing Records...';
  }

  try {
    const user = AG.currentUser();
    if (!user) {
      showToast('Please log in first.', 'error');
      return;
    }

    const farmData = await AG.loadData();
    if (!farmData) {
      showToast('No farm data found to sync.', 'info');
      return;
    }

    const { animals = [], healthRec = [], breedRec = [], salesRec = [], feedRec = [] } = farmData;
    let addedCount = 0;

    // 1. Check & Sync Animals
    for (const a of animals) {
      const exists = agriChain.chain.some(b => b.data && b.data.animalId === a.id && b.data.type === 'ANIMAL_REGISTRATION');
      if (!exists) {
        await addBlockchainRecord({
          type: 'ANIMAL_REGISTRATION',
          animalId: a.id,
          name: a.name,
          species: a.species,
          breed: a.breed,
          weight: a.weight,
          health: a.health,
          timestamp: a.dob || new Date().toISOString()
        });
        addedCount++;
      }
    }

    // 2. Check & Sync Health Records
    for (const h of healthRec) {
      const exists = agriChain.chain.some(b => b.data && (b.data.recordId === h.id || (b.data.animalId === h.animalId && b.data.desc === h.desc)));
      if (!exists) {
        await addBlockchainRecord({
          type: 'HEALTH_EVENT',
          recordId: h.id,
          animalId: h.animalId,
          eventType: h.type,
          desc: h.desc,
          vet: h.vet,
          date: h.date,
          timestamp: h.date || new Date().toISOString()
        });
        addedCount++;
      }
    }

    // 3. Check & Sync Sales
    for (const s of salesRec) {
      const exists = agriChain.chain.some(b => b.data && (b.data.saleId === s.id || b.data.animalId === s.animalId));
      if (!exists) {
        const original = Object.assign({}, s, { status: 'Pending' });
        const recordHash = await AG.sha256(JSON.stringify(original));
        const buyerRef = (await AG.sha256((s.buyer || '').toLowerCase())).slice(0, 12);
        await addBlockchainRecord({
          type: 'SALE_TRANSACTION',
          saleId: s.id,
          animalId: s.animalId,
          species: s.species,
          price: s.price,
          buyerRef,
          recordHash,
          timestamp: s.date || new Date().toISOString()
        });
        addedCount++;
      }
    }

    // 4. Check & Sync Breeding
    for (const b of breedRec) {
      const exists = agriChain.chain.some(b => b.data && (b.data.breedingId === b.id || (b.data.dam === b.dam && b.data.sire === b.sire)));
      if (!exists) {
        await addBlockchainRecord({
          type: 'BREEDING_RECORD',
          breedingId: b.id,
          dam: b.dam,
          sire: b.sire,
          status: b.status,
          timestamp: b.matingDate || new Date().toISOString()
        });
        addedCount++;
      }
    }

    // 5. Check & Sync Feed
    for (const f of feedRec) {
      const exists = agriChain.chain.some(b => b.data && (b.data.feedId === f.id || (b.data.feedType === f.type && b.data.qty === f.qty)));
      if (!exists) {
        await addBlockchainRecord({
          type: 'FEED_LOGGED',
          feedId: f.id,
          feedType: f.type,
          species: f.species,
          qty: f.qty,
          cost: f.cost,
          timestamp: f.date || new Date().toISOString()
        });
        addedCount++;
      }
    }

    renderChain();
    if (activeBlockchainView === 'anchors') renderSmartContractAnchors();

    if (addedCount > 0) {
      showToast(`🎉 Successfully synced ${addedCount} farm records to blockchain!`, 'success');
    } else {
      showToast('All farm records are already synced and sealed on blockchain.', 'info');
    }
  } catch (err) {
    console.error('Sync failed:', err);
    showToast('Record sync failed: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Sync All Farm Records';
    }
  }
}

/* =========================================================
   DISPLAY BLOCKCHAIN RECORDS
========================================================= */

function renderChain() {
  const container = document.getElementById('chain-container');
  if (!container) return;

  container.innerHTML = '';

  const searchQuery = (document.getElementById('search-chain')?.value || '').trim().toLowerCase();
  const filterType = document.getElementById('filter-type')?.value || '';

  const filteredBlocks = agriChain.chain.filter(block => {
    const type = block.data?.type || 'GENESIS';
    if (filterType && type !== filterType) return false;

    if (searchQuery) {
      const content = (JSON.stringify(block.data) + ' ' + block.hash + ' ' + block.index).toLowerCase();
      if (!content.includes(searchQuery)) return false;
    }

    return true;
  });

  if (!filteredBlocks.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
        <p style="font-size:15px; margin-bottom:8px;">🔍 No blockchain records found matching your filters.</p>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('search-chain').value=''; document.getElementById('filter-type').value=''; renderChain();">Clear Filters</button>
      </div>
    `;
    return;
  }

  filteredBlocks.forEach((block) => {
    const card = document.createElement('div');
    card.className = 'block-card valid';
    card.id = `block-${block.index}`;

    const type = block.data.type || 'GENESIS';
    const color = blockTypeColor(type);

    card.style.borderLeft = `3px solid ${color}`;
    card.style.padding = '16px';
    card.style.marginBottom = '12px';

    const heading = document.createElement('div');
    heading.style.display = 'flex';
    heading.style.justifyContent = 'space-between';
    heading.style.alignItems = 'center';
    heading.style.marginBottom = '8px';

    const title = document.createElement('strong');
    title.style.fontSize = '14px';
    title.textContent = `${blockTypeIcon(type)} Block #${block.index}`;

    const badge = document.createElement('span');
    badge.className = 'badge badge-green';
    badge.textContent = type;

    heading.append(title, badge);

    const date = document.createElement('p');
    date.className = 'text-muted';
    date.style.fontSize = '12px';
    date.style.marginBottom = '10px';
    date.textContent = new Date(block.timestamp).toLocaleString();

    const recordLabel = document.createElement('strong');
    recordLabel.style.fontSize = '12px';
    recordLabel.textContent = 'Record Details:';

    const record = document.createElement('pre');
    record.style.cssText =
      'white-space:pre-wrap;word-break:break-word;' +
      'padding:10px;border-radius:6px;overflow-x:auto;font-size:12px;margin-top:4px;';
    record.textContent = JSON.stringify(block.data, null, 2);

    const hashLabel = document.createElement('div');
    hashLabel.textContent = 'Block Hash:';
    hashLabel.style.cssText = 'font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600; margin-top:12px;';

    const hash = document.createElement('code');
    hash.textContent = block.hash;
    hash.style.cssText = 'font-size:11px;word-break:break-all;color:var(--text-accent);display:block;';

    const previousLabel = document.createElement('div');
    previousLabel.textContent = 'Previous Hash:';
    previousLabel.style.cssText = 'font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:600; margin-top:8px;';

    const previousHash = document.createElement('code');
    previousHash.textContent = block.previousHash;
    previousHash.style.cssText = 'font-size:11px;word-break:break-all;color:var(--text-secondary);display:block;';

    const nonce = document.createElement('div');
    nonce.style.cssText = 'font-size:12px; margin-top:8px; color:var(--text-secondary);';
    nonce.textContent = `Proof-of-Work Nonce: ${block.nonce}`;

    card.append(
      heading,
      date,
      recordLabel,
      record,
      hashLabel,
      hash,
      previousLabel,
      previousHash,
      nonce
    );

    container.appendChild(card);
  });

  /* UPDATE BLOCK COUNT */
  const statBlocks = document.getElementById('stat-blocks');
  if (statBlocks) {
    statBlocks.textContent = agriChain.chain.length;
  }

  const stats = document.getElementById('chain-stats');
  if (stats) {
    stats.innerHTML = '';

    const blockCount = document.createElement('span');
    blockCount.className = 'stat-pill';
    blockCount.textContent = `⛓ ${agriChain.chain.length} Total Blocks`;

    const difficulty = document.createElement('span');
    difficulty.className = 'stat-pill';
    difficulty.textContent = `Difficulty: ${agriChain.difficulty}`;

    const proof = document.createElement('span');
    proof.className = 'stat-pill';
    proof.textContent = 'Proof of Work';

    stats.append(blockCount, difficulty, proof);
  }
}

/* =========================================================
   MINING STATUS
========================================================= */

function showMiningStatus(mining, recordType = '') {
  const element = document.getElementById('mining-status');

  if (!element) return;

  if (mining) {
    element.style.display = 'block';
    element.textContent = `Mining ${recordType} record...`;
  } else {
    element.style.display = 'none';
    element.textContent = '';
  }
}

/* =========================================================
   VERIFY BLOCKCHAIN INTEGRITY
========================================================= */

async function verifyChain() {
  const button = document.getElementById('verify-btn');
  const result = document.getElementById('verify-result');

  if (!result || !button) return;

  button.disabled = true;
  button.textContent = 'Verifying...';

  try {
    const valid = await agriChain.isChainValid();

    result.style.display = 'flex';

    if (valid) {
      result.className = 'alert alert-success';
      result.textContent =
        `Chain is valid. All ${agriChain.chain.length} blocks passed verification.`;
    } else {
      result.className = 'alert alert-danger';
      result.textContent =
        'Chain integrity failed. A block has been changed or disconnected.';
    }

    for (let i = 0; i < agriChain.chain.length; i++) {
      const block = agriChain.chain[i];
      const card = document.getElementById(`block-${i}`);

      if (!card) continue;

      const hashValid =
        block.hash === await block.calculateHash();

      const linkValid =
        i === 0
          ? block.previousHash === '0'.repeat(64)
          : block.previousHash === agriChain.chain[i - 1].hash;

      card.classList.toggle(
        'invalid',
        !hashValid || !linkValid
      );

      card.classList.toggle(
        'valid',
        hashValid && linkValid
      );
    }

  } catch (error) {
    console.error(error);

    result.style.display = 'flex';
    result.className = 'alert alert-danger';
    result.textContent = 'Verification could not be completed.';
  } finally {
    button.disabled = false;
    button.textContent = '🛡 Verify Integrity';
  }
}

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

