const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebase_uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    avatar_url: { type: String, default: null },
    role: { type: String, enum: ['citizen', 'official'], default: 'citizen' },
    department: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('User', userSchema);
