const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let app;

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (err) {
      console.warn('⚠️ Firebase Admin credential parsing failed (maybe placeholder key). Falling back to development mode without credentials.', err.message);
      app = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'civisync-demo',
      });
    }
  } else {
    // Development / placeholder fallback
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'civisync-demo',
    });
  }
} else {
  app = getApps()[0];
}

module.exports = { app, getAuth };

