/* Livestock Management App — Core Client API Library */
'use strict';
(function () {
  const AG = window.AG = window.AG || {};
  const CFG = window.AGRI_CONFIG || {};
  const API = CFG.API_URL || 'http://localhost:4001/api';
  const SESSION = 'livestock_session_v1';

  const readSession = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION) || 'null'); } catch { return null; }
  };
  const writeSession = s => sessionStorage.setItem(SESSION, JSON.stringify(s));

  AG.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AG.initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

  // Standalone SHA-256 hash
  function sha256js(msg) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const b = Array.from(new TextEncoder().encode(msg)), l = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      [a, bb, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) | 0);
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  AG.sha256 = async value => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (window.crypto && crypto.subtle) {
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    return sha256js(text);
  };

  async function request(path, options = {}) {
    const s = readSession();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (s?.token) headers.Authorization = 'Bearer ' + s.token;
    const response = await fetch(API + path, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }
  AG.apiRequest = request;

  // --------- Authentication ---------
  AG.signUp = async (name, email, password, role = 'farmer') => {
    try {
      const out = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
      writeSession({ token: out.token, user: out.user });
      return { ok: true, user: out.user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  AG.login = async (email, password) => {
    try {
      const out = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      writeSession({ token: out.token, user: out.user });
      return { ok: true, user: out.user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  AG.logout = () => {
    sessionStorage.removeItem(SESSION);
    location.href = 'index.html';
  };

  AG.currentUser = () => {
    const s = readSession();
    return s?.user || null;
  };

  AG.guard = (opts = {}) => {
    const u = AG.currentUser();
    if (!u) {
      location.replace('login.html');
      return null;
    }
    if (opts.needRegistered && !u.registered) {
      location.replace('welcome.html');
      return null;
    }
    if (opts.needUnregistered && u.registered) {
      location.replace('dashboard.html');
      return null;
    }
    if (opts.roles && !opts.roles.includes(u.role)) {
      alert('You do not have permission to access this module.');
      const dest = u.role === 'veterinary_officer' ? 'vet-dashboard.html'
                 : u.role === 'buyer' ? 'marketplace.html'
                 : (u.role === 'security_admin' || u.role === 'admin') ? 'admin.html'
                 : 'dashboard.html';
      location.replace(dest);
      return null;
    }
    return u;
  };

  // --------- Farm Data & Registration ---------
  AG.completeRegistration = async (farm) => {
    try {
      await request('/farm/register', { method: 'POST', body: JSON.stringify(farm) });
      const s = readSession();
      if (s?.user) {
        s.user.registered = true;
        s.user.farm = farm;
        writeSession(s);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  AG.loadData = async () => request('/farm/data');
  AG.saveData = async (data) => {
    try {
      await request('/farm/data', { method: 'PUT', body: JSON.stringify({ data }) });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  AG.exportData = async () => {
    try {
      const out = await request('/farm/export');
      const filename = `AgriChain_My_Data_${(out.user?.email || 'export').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') {
        showToast('Your account and farm data were exported successfully! (GDPR Art. 20)', 'success');
      } else {
        alert('Your account and farm data were exported successfully! (GDPR Art. 20)');
      }
    } catch (e) {
      if (typeof showToast === 'function') {
        showToast('Export failed: ' + e.message, 'error');
      } else {
        alert('Export failed: ' + e.message);
      }
    }
  };

  AG.deleteAccount = async () => {
    if (!confirm('Permanently delete your account and associated records? This cannot be undone.')) return;
    try {
      await request('/farm/account', { method: 'DELETE' });
      sessionStorage.removeItem(SESSION);
      location.href = 'index.html';
    } catch (e) {
      alert(e.message);
    }
  };

  // --------- Blockchain Anchoring ---------
  AG.auditBlockchain = async (recordType, record) => {
    return request('/blockchain/anchor', { method: 'POST', body: JSON.stringify({ recordType, record }) });
  };

  AG.getBlockchainAnchors = async () => {
    try {
      const out = await request('/blockchain/anchors');
      return out.anchors || [];
    } catch (e) {
      return [];
    }
  };

  AG.getAIImports = async () => request('/ai/imports');
  AG.saveAIImports = async (rows) => request('/ai/imports', { method: 'PUT', body: JSON.stringify({ rows }) });
  AG.clearAIImports = async () => request('/ai/imports', { method: 'DELETE' });

  // --------- Veterinary Officer Helpers ---------
  AG.listVets = async () => {
    try {
      const out = await request('/vets');
      return out.vets || [];
    } catch (e) {
      return [];
    }
  };

  AG.assignVet = async (vetId, animalIds = []) => {
    return await request('/vets/assign', { method: 'POST', body: JSON.stringify({ vetId, animalIds }) });
  };

  AG.getVetAssignments = async () => {
    try {
      const out = await request('/vets/assignments');
      return out.assignments || [];
    } catch (e) {
      return [];
    }
  };

  AG.submitHealthRecord = async (record) => {
    return await request('/health/record', { method: 'POST', body: JSON.stringify(record) });
  };
})();
