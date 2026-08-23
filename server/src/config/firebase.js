const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

/**
 * Normalises a Firebase private key that may be stored in .env in various formats:
 *  1. Proper PEM with real newlines
 *  2. PEM with literal \n escape sequences
 *  3. Raw base64 without PEM headers (missing BEGIN/END markers)
 */
function normalizePrivateKey(raw) {
  if (!raw) return undefined;

  // Replace literal \n escape sequences with real newlines
  let key = raw.replace(/\\n/g, '\n');

  // If the key is missing PEM headers, add them
  if (!key.includes('-----BEGIN')) {
    // Strip any accidental whitespace/newlines from raw base64
    const base64 = key.replace(/\s/g, '');
    // Re-chunk into 64-character lines as PEM requires
    const chunks = base64.match(/.{1,64}/g) || [];
    key = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }

  return key;
}

let app;

if (!getApps().length) {
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin initialised with service account credentials.');
    } catch (err) {
      console.warn('⚠️ Firebase Admin credential parsing failed. Falling back to no-credential mode.', err.message);
      app = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'civisync-demo',
      });
    }
  } else {
    // Development / placeholder fallback
    console.warn('⚠️ Firebase Admin running without credentials (development mode).');
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'civisync-demo',
    });
  }
} else {
  app = getApps()[0];
}

module.exports = { app, getAuth };

