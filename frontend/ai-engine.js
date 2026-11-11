/* ================================================================
   AgriChain — ai-engine.js
   Synthetic dataset + custom ML models:
   1. Linear Regression — predict weight from age + feed
   2. Health Risk Classifier — decision tree logic
   3. Time-series weight forecast
   ================================================================ */

'use strict';

/* ─── Synthetic Dataset (500 records) ───────────────────────── */
const SPECIES_CONFIG = {
  Cattle: { minAge: 6, maxAge: 48, minWeight: 150, maxWeight: 750, feedMin: 8, feedMax: 22, pricePerKg: 30 },
  Goat: { minAge: 4, maxAge: 36, minWeight: 20, maxWeight: 95, feedMin: 1, feedMax: 3, pricePerKg: 45 },
  Sheep: { minAge: 4, maxAge: 36, minWeight: 25, maxWeight: 90, feedMin: 1, feedMax: 2.5, pricePerKg: 42 },
  Pig: { minAge: 3, maxAge: 24, minWeight: 30, maxWeight: 160, feedMin: 2, feedMax: 5, pricePerKg: 35 },
  Poultry: { minAge: 1, maxAge: 12, minWeight: 0.5, maxWeight: 4, feedMin: 0.1, feedMax: 0.3, pricePerKg: 60 },
};

const BREEDS = {
  Cattle: ['Nguni', 'Brahman', 'Holstein', 'Simmental', 'Angus', 'Hereford'],
  Goat: ['Boer', 'Kalahari Red', 'Savanna', 'Saanen'],
  Sheep: ['Merino', 'Dorper', 'SA Mutton Merino', 'Damara'],
  Pig: ['Large White', 'Landrace', 'Duroc', 'Pietrain'],
  Poultry: ['Ross 308', 'Cobb 500', 'Layer Brown', 'Layer White'],
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function seededRand(seed) { return ((Math.sin(seed) * 10000) % 1 + 1) % 1; }

function generateDataset(n = 1200) {
  const species = Object.keys(SPECIES_CONFIG);
  const records = [];

  for (let i = 0; i < n; i++) {
    const sp = species[i % species.length];
    const cfg = SPECIES_CONFIG[sp];
    const breed = BREEDS[sp][randInt(0, BREEDS[sp].length - 1)];

    const ageMonths = randInt(cfg.minAge, cfg.maxAge);
    const feedKgDay = rand(cfg.feedMin, cfg.feedMax);

    // Weight as function of age + feed with some noise
    const ageEffect = (ageMonths / cfg.maxAge) * 0.6;
    const feedEffect = ((feedKgDay - cfg.feedMin) / (cfg.feedMax - cfg.feedMin)) * 0.3;
    const noise = (Math.random() - 0.5) * 0.15;
    const weightFrac = Math.min(1, Math.max(0.05, ageEffect + feedEffect + noise));
    const weight = cfg.minWeight + weightFrac * (cfg.maxWeight - cfg.minWeight);

    const vaccinated = Math.random() > 0.2;
    const baseHealthScore = vaccinated ? rand(60, 100) : rand(30, 80);
    const healthScore = Math.min(100, Math.max(0, baseHealthScore - (Math.random() > 0.85 ? rand(10, 40) : 0)));
    const healthRisk = healthScore >= 70 ? 'Low' : (healthScore >= 45 ? 'Medium' : 'High');

    const daysToMarket = Math.max(0, randInt(0, 180));
    const salePrice = weight * cfg.pricePerKg * (0.85 + Math.random() * 0.3);

    records.push({
      id: `DS-${String(i + 1).padStart(4, '0')}`,
      species: sp,
      breed,
      ageMonths: Math.round(ageMonths),
      weightKg: parseFloat(weight.toFixed(1)),
      feedKgDay: parseFloat(feedKgDay.toFixed(2)),
      vaccinated,
      healthScore: parseFloat(healthScore.toFixed(1)),
      healthRisk,
      daysToMarket,
      salePriceLSL: parseFloat(salePrice.toFixed(2)),
      source: 'synthetic',
    });
  }

  return records;
}

/* ─── Global Dataset ─────────────────────────────────────────── */
let DATASET = generateDataset(1200);

/* ─── Real-world rows imported by the farmer (stored in Firestore) ─ */
let importedRowsCache = null;

function legacyImportKeys() {
  const email = window.AG && typeof AG.currentUser === 'function' && AG.currentUser()?.email;
  return [email ? `agrichain_dataset_import_${email}` : null, 'agrichain_dataset_import_guest'].filter(Boolean);
}

async function loadImported() {
  if (Array.isArray(importedRowsCache)) return importedRowsCache;
  if (!window.AG || typeof AG.getAIImports !== 'function') return [];

  const result = await AG.getAIImports();
  const rows = Array.isArray(result.rows) ? result.rows.slice() : [];
  const legacyKeys = legacyImportKeys();
  let foundLegacy = false;
  for (const key of legacyKeys) {
    try {
      const oldRows = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(oldRows) || !oldRows.length) continue;
      foundLegacy = true;
      const known = new Set(rows.map(row => row.id));
      oldRows.forEach(row => {
        if (row && !known.has(row.id)) {
          rows.push(row);
          known.add(row.id);
        }
      });
    } catch (_) {}
  }
  if (foundLegacy) {
    await AG.saveAIImports(rows);
    legacyKeys.forEach(key => localStorage.removeItem(key));
  }
  importedRowsCache = rows;
  return rows;
}

async function refreshDataset() {
  DATASET = generateDataset(1200);
  (await loadImported()).forEach(r => DATASET.push(r));
  if (typeof trainAllModels === 'function') trainAllModels();
}

/* CSV columns (header required): species, ageMonths, weightKg, feedKgDay  — optional: breed, vaccinated, healthScore, salePriceLSL (or salePriceLSL), daysToMarket */
async function importCSV(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { added: 0, skipped: 0, error: 'The file has no data rows.' };
  const head = lines[0].split(',').map(h => h.trim().toLowerCase());
  const col = n => head.indexOf(n.toLowerCase());
  const miss = ['species', 'agemonths', 'weightkg', 'feedkgday'].filter(n => col(n) < 0);
  if (miss.length) return { added: 0, skipped: 0, error: 'Missing column(s): ' + miss.join(', ') };

  const existing = await loadImported(), fresh = []; let skipped = 0;
  for (const line of lines.slice(1, 2001)) {
    const c = line.split(',').map(x => x.trim());
    const get = n => (col(n) >= 0 ? c[col(n)] : undefined);
    const sp = (get('species') || '').toLowerCase(); const species = Object.keys(SPECIES_CONFIG).find(k => k.toLowerCase() === sp);
    const age = parseFloat(get('agemonths')), w = parseFloat(get('weightkg')), feed = parseFloat(get('feedkgday'));
    if (!species || !(age > 0) || !(w > 0) || !(feed > 0)) { skipped++; continue; }
    const hs = parseFloat(get('healthscore')); const healthScore = isFinite(hs) ? Math.min(100, Math.max(0, hs)) : 75;
    const price = parseFloat(get('salepricelsl') ?? get('salepricezar'));
    fresh.push({
      id: 'IMP-' + String(existing.length + fresh.length + 1).padStart(4, '0'),
      species, breed: get('breed') || 'Unknown', ageMonths: Math.round(age), weightKg: w, feedKgDay: feed,
      vaccinated: ['true', '1', 'yes', 'y'].includes((get('vaccinated') || 'true').toLowerCase()),
      healthScore, healthRisk: healthScore >= 70 ? 'Low' : (healthScore >= 45 ? 'Medium' : 'High'),
      daysToMarket: parseInt(get('daystomarket'), 10) || 0,
      salePriceLSL: isFinite(price) ? price : parseFloat((w * SPECIES_CONFIG[species].pricePerKg).toFixed(2)),
      source: 'imported',
    });
  }
  if (!fresh.length) return { added: 0, skipped, error: 'No valid rows found (check species names and positive numbers).' };
  if (existing.length + fresh.length > 2000) return { added: 0, skipped, error: 'The saved dataset limit is 2,000 imported records.' };
  const saved = existing.concat(fresh);
  await AG.saveAIImports(saved);
  importedRowsCache = saved;
  fresh.forEach(r => DATASET.push(r));
  trainAllModels();
  return { added: fresh.length, skipped };
}
async function clearImported() {
  await AG.clearAIImports();
  importedRowsCache = [];
  legacyImportKeys().forEach(key => localStorage.removeItem(key));
}

/* ─── Hold-out evaluation + learning curves (accuracy & saturation) ─ */
function splitIdx(n) {
  const idx = [...Array(n).keys()].sort((a, b) => seededRand(a + 1) - seededRand(b + 1));   // deterministic shuffle
  const cut = Math.floor(n * 0.8);
  return { train: idx.slice(0, cut), test: idx.slice(cut) };
}
function fitScore(trainRows, testRows) {
  const m = linearRegression(trainRows.map(r => [r.ageMonths, r.feedKgDay]), trainRows.map(r => r.weightKg));
  const pred = rows => rows.map(r => predictWeight(m, r.ageMonths, r.feedKgDay));
  return {
    model: m, trainR2: computeRSquared(trainRows.map(r => r.weightKg), pred(trainRows)),
    testR2: computeRSquared(testRows.map(r => r.weightKg), pred(testRows)),
    testMAE: computeMAE(testRows.map(r => r.weightKg), pred(testRows)),
    testRMSE: computeRMSE(testRows.map(r => r.weightKg), pred(testRows))
  };
}
function learningCurve(sp) {
  const rows = DATASET.filter(r => r.species === sp);
  if (rows.length < 20) return null;
  const { train, test } = splitIdx(rows.length), testRows = test.map(i => rows[i]), points = [];
  for (let k = 1; k <= 8; k++) {
    const n = Math.max(5, Math.round(train.length * k / 8));
    const f = fitScore(train.slice(0, n).map(i => rows[i]), testRows);
    if (isFinite(f.testR2) && isFinite(f.trainR2)) points.push({ n, trainR2: +f.trainR2.toFixed(4), testR2: +f.testR2.toFixed(4) });
  }
  if (!points.length) return null;
  const best = Math.max(...points.map(p => p.testR2));
  const sat = points.find(p => p.testR2 >= best - 0.01);
  return { points, bestTestR2: best, saturationN: sat ? sat.n : null, testSize: testRows.length };
}

/* ─── Model 1: Linear Regression ────────────────────────────── */
// Predict weightKg from ageMonths and feedKgDay
// Simple multivariate linear regression using normal equation approximations

function linearRegression(X, y) {
  // X is array of [age, feed] pairs; y is array of weights
  const n = X.length;
  let sumX1 = 0, sumX2 = 0, sumY = 0, sumX1X2 = 0;
  let sumX1Y = 0, sumX2Y = 0, sumX1Sq = 0, sumX2Sq = 0;

  for (let i = 0; i < n; i++) {
    const [x1, x2] = X[i];
    const yi = y[i];
    sumX1 += x1; sumX2 += x2; sumY += yi;
    sumX1X2 += x1 * x2; sumX1Y += x1 * yi; sumX2Y += x2 * yi;
    sumX1Sq += x1 * x1; sumX2Sq += x2 * x2;
  }

  const meanX1 = sumX1 / n, meanX2 = sumX2 / n, meanY = sumY / n;
  const Sxx1 = sumX1Sq - n * meanX1 * meanX1;
  const Sxx2 = sumX2Sq - n * meanX2 * meanX2;
  const Sxy1 = sumX1Y - n * meanX1 * meanY;
  const Sxy2 = sumX2Y - n * meanX2 * meanY;
  const Sx1x2 = sumX1X2 - n * meanX1 * meanX2;

  // Solve 2x2 system: [Sxx1 Sx1x2; Sx1x2 Sxx2] * [b1;b2] = [Sxy1;Sxy2]
  const det = Sxx1 * Sxx2 - Sx1x2 * Sx1x2;
  const b1 = (Sxy1 * Sxx2 - Sxy2 * Sx1x2) / det;
  const b2 = (Sxy2 * Sxx1 - Sxy1 * Sx1x2) / det;
  const b0 = meanY - b1 * meanX1 - b2 * meanX2;

  return { b0, b1, b2 };
}

function predictWeight(model, age, feed) {
  return model.b0 + model.b1 * age + model.b2 * feed;
}

function computeRSquared(actual, predicted) {
  const meanY = actual.reduce((s, v) => s + v, 0) / actual.length;
  const ssTot = actual.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const ssRes = actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0);
  return 1 - ssRes / ssTot;
}

function computeMAE(actual, predicted) {
  return actual.reduce((s, v, i) => s + Math.abs(v - predicted[i]), 0) / actual.length;
}

function computeRMSE(actual, predicted) {
  const mse = actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0) / actual.length;
  return Math.sqrt(mse);
}

/* ─── Model 2: Health Risk Classifier ───────────────────────── */
// Decision-tree-like classification
function classifyHealthRisk(healthScore, vaccinated, ageMonths) {
  if (healthScore >= 80 && vaccinated) return 'Low';
  if (healthScore >= 70) return 'Low';
  if (healthScore >= 50 && ageMonths < 30) return 'Medium';
  if (healthScore >= 45) return 'Medium';
  return 'High';
}

function evalClassifier(dataset) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  let correct = 0;

  const matrix = { Low: { Low: 0, Medium: 0, High: 0 }, Medium: { Low: 0, Medium: 0, High: 0 }, High: { Low: 0, Medium: 0, High: 0 } };

  dataset.forEach(r => {
    const pred = classifyHealthRisk(r.healthScore, r.vaccinated, r.ageMonths);
    const actual = r.healthRisk;
    matrix[actual][pred]++;
    if (pred === actual) correct++;
  });

  const accuracy = (correct / dataset.length * 100).toFixed(1);
  return { accuracy, matrix };
}

/* ─── Model 3: Weight Forecast (6-month) ───────────────────── */
function forecastWeight(species, currentWeight, currentAgeMonths, model, feed) {
  const forecast = [];
  const cfg = SPECIES_CONFIG[species];
  for (let m = 1; m <= 6; m++) {
    const futureAge = currentAgeMonths + m;
    const pred = Math.min(cfg.maxWeight, Math.max(cfg.minWeight,
      predictWeight(model, futureAge, feed)
    ));
    forecast.push({ month: m, predictedWeight: parseFloat(pred.toFixed(1)) });
  }
  return forecast;
}

/* ─── Train Models ───────────────────────────────────────────── */
const MODELS = {};
const MODEL_METRICS = {};

function trainAllModels() {
  const species = Object.keys(SPECIES_CONFIG);

  species.forEach(sp => {
    const subset = DATASET.filter(r => r.species === sp);
    if (subset.length < 5) return;

    const X = subset.map(r => [r.ageMonths, r.feedKgDay]);
    const y = subset.map(r => r.weightKg);

    const model = linearRegression(X, y);
    const preds = subset.map(r => predictWeight(model, r.ageMonths, r.feedKgDay));

    const r2 = computeRSquared(y, preds);
    const mae = computeMAE(y, preds);
    const rmse = computeRMSE(y, preds);

    const ho = (() => { try { const { train, test } = splitIdx(subset.length); return fitScore(train.map(i => subset[i]), test.map(i => subset[i])); } catch { return null; } })();
    MODELS[sp] = model;
    MODEL_METRICS[sp] = {
      r2: parseFloat(r2.toFixed(4)),
      mae: parseFloat(mae.toFixed(2)),
      rmse: parseFloat(rmse.toFixed(2)),
      n: subset.length,
      r2Test: ho && isFinite(ho.testR2) ? parseFloat(ho.testR2.toFixed(4)) : null,
      maeTest: ho && isFinite(ho.testMAE) ? parseFloat(ho.testMAE.toFixed(2)) : null
    };
  });

  // Classifier eval
  const classResults = evalClassifier(DATASET);
  MODEL_METRICS['Classifier'] = classResults;
}

trainAllModels();

/* ─── Exports ─────────────────────────────────────────────────── */
window.AgriAI = {
  get DATASET() { return DATASET; },
  MODELS,
  MODEL_METRICS,
  SPECIES_CONFIG,
  predictWeight,
  classifyHealthRisk,
  forecastWeight,
  trainAllModels,
  refreshDataset,
  importCSV,
  clearImported,
  learningCurve,
};
