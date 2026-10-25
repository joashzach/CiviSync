require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { app, getAuth } = require('../config/firebase');
const Official = require('../models/Official');
const User = require('../models/User');

const DEFAULT_OFFICIALS = [
  { email: "roads@civicconnect.gov", department: "Roads & Highways" },
  { email: "sanitation@civicconnect.gov", department: "Sanitation" },
  { email: "streetlights@civicconnect.gov", department: "Electrical Maintenance" },
  { email: "waterworks@civicconnect.gov", department: "Water & Drainage" },
  { email: "parks@civicconnect.gov", department: "Parks & Public Spaces" },
  { email: "encroachment@civicconnect.gov", department: "Town Planning & Encroachment" },
  { email: "noise@civicconnect.gov", department: "Pollution Control" }
];

async function setPasswordForEmail(auth, email, newPassword, department = null) {
  const normalizedEmail = email.trim().toLowerCase();
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(userRecord.uid, {
      password: newPassword,
    });
    console.log(`✅ Updated password in Firebase Auth for: ${normalizedEmail} (UID: ${userRecord.uid})`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: normalizedEmail,
        password: newPassword,
        displayName: department || 'Official',
      });
      console.log(`✨ Created new Firebase Auth account for: ${normalizedEmail} (UID: ${userRecord.uid})`);
    } else {
      throw error;
    }
  }

  // Also ensure the user is registered in MongoDB Official whitelist & User collection
  try {
    let officialDoc = await Official.findOne({ email: normalizedEmail });
    if (!officialDoc && department) {
      officialDoc = await Official.create({ email: normalizedEmail, department });
      console.log(`  └─ Added ${normalizedEmail} to MongoDB Official collection (${department})`);
    }

    const dept = department || officialDoc?.department || 'Administration';
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        firebase_uid: userRecord.uid,
        email: normalizedEmail,
        name: userRecord.displayName || dept,
        role: 'official',
        department: dept,
      },
      { upsert: true, new: true }
    );
    console.log(`  └─ Synced user role='official' in MongoDB Users collection.`);
  } catch (dbErr) {
    console.warn(`  ⚠️ MongoDB sync warning: ${dbErr.message}`);
  }
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node src/scripts/setOfficialPassword.js <email> <newPassword>
  node src/scripts/setOfficialPassword.js --all <newPassword>

Examples:
  node src/scripts/setOfficialPassword.js roads@civicconnect.gov Password@123
  node src/scripts/setOfficialPassword.js --all Official@2025
    `);
    process.exit(0);
  }

  const auth = getAuth(app);

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (e) {
      console.warn('Could not connect to MongoDB:', e.message);
    }
  }

  try {
    if (args[0] === '--all') {
      const newPassword = args[1];
      if (!newPassword || newPassword.length < 8) {
        console.error('❌ Error: Password must be at least 8 characters.');
        process.exit(1);
      }

      console.log(`\nSetting password for ALL ${DEFAULT_OFFICIALS.length} default officials...\n`);
      for (const off of DEFAULT_OFFICIALS) {
        await setPasswordForEmail(auth, off.email, newPassword, off.department);
      }
      console.log(`\n🎉 Successfully updated/created all official accounts with the new password!`);
    } else {
      const email = args[0];
      const newPassword = args[1];

      if (!email || !newPassword) {
        console.error('❌ Error: Both email and password are required.');
        process.exit(1);
      }

      if (newPassword.length < 8) {
        console.error('❌ Error: Password must be at least 8 characters.');
        process.exit(1);
      }

      const match = DEFAULT_OFFICIALS.find(o => o.email.toLowerCase() === email.toLowerCase());
      await setPasswordForEmail(auth, email, newPassword, match?.department);
      console.log(`\n🎉 Done! Official ${email} can now log in with the new password.`);
    }
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

run();
