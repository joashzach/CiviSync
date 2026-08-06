const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<user>')) {
      console.warn('⚠️ MONGODB_URI is using a placeholder. Skipping DB connection. Update server/.env with real MongoDB URI.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning: ${err.message}. Server will continue running.`);
  }
};

module.exports = connectDB;
