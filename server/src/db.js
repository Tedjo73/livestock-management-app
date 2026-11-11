const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err.message);
  }
}

if (!serviceAccount) {
  try {
    serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  } catch (err) {
    console.warn('Local serviceAccountKey.json not found:', err.message);
  }
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = db;
