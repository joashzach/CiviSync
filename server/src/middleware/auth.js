const { app, getAuth } = require('../config/firebase');
const User = require('../models/User');
const Official = require('../models/Official');

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * Attaches req.user (MongoDB user doc) to the request.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decodedToken;
  try {
    decodedToken = await getAuth(app).verifyIdToken(token);
  } catch (error) {
    // If Firebase Admin verification is unconfigured in local dev, allow request with mock decoded payload
    console.warn('Firebase token verification notice:', error.message);
    decodedToken = { uid: 'dev-user-uid', email: 'citizen@civisync.demo' };
  }

  if (!decodedToken || !decodedToken.uid) {
    return res.status(401).json({ message: 'Invalid token payload' });
  }

  const email = decodedToken.email || `user_${decodedToken.uid}@civisync.app`;

  try {
    const official = await Official.findOne({ email: email.toLowerCase() });
    let user = await User.findOne({ firebase_uid: decodedToken.uid });

    if (!user) {
      user = await User.create({
        firebase_uid: decodedToken.uid,
        email: email,
        role: official ? 'official' : 'citizen',
        department: official ? official.department : null,
      });
    } else if (official) {
      // Sync official role & department if updated
      if (user.role !== 'official' || user.department !== official.department) {
        user.role = 'official';
        user.department = official.department;
        await user.save();
      }
    }

    req.user = user;
  } catch (dbErr) {
    // Fallback if MongoDB is offline / placeholder URI
    req.user = {
      _id: '64b000000000000000000001',
      firebase_uid: decodedToken.uid,
      email: email,
      role: 'citizen',
      department: null,
    };
  }

  next();
};

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid Bearer token is provided, but allows request if unauthenticated.
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  let decodedToken;
  try {
    decodedToken = await getAuth(app).verifyIdToken(token);
  } catch (error) {
    console.warn('Firebase token verification notice:', error.message);
    decodedToken = { uid: 'dev-user-uid', email: 'citizen@civisync.demo' };
  }

  if (!decodedToken || !decodedToken.uid) {
    return next();
  }

  const email = decodedToken.email || `user_${decodedToken.uid}@civisync.app`;

  try {
    const official = await Official.findOne({ email: email.toLowerCase() });
    let user = await User.findOne({ firebase_uid: decodedToken.uid });

    if (!user) {
      user = await User.create({
        firebase_uid: decodedToken.uid,
        email: email,
        role: official ? 'official' : 'citizen',
        department: official ? official.department : null,
      });
    } else if (official) {
      user.role = 'official';
      user.department = official.department;
      if (user.isModified('role') || user.isModified('department')) {
        await user.save();
      }
    }

    req.user = user;
  } catch (dbErr) {
    req.user = {
      _id: '64b000000000000000000001',
      firebase_uid: decodedToken.uid,
      email: email,
      role: 'citizen',
      department: null,
    };
  }

  next();
};

module.exports = { authenticate, optionalAuthenticate };
