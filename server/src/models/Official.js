const mongoose = require('mongoose');

const officialSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    department: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Official', officialSchema);
