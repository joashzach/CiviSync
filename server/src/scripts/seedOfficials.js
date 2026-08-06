require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Official = require('../models/Official');

const officials = [
  { email: "roads@civicconnect.gov", department: "Roads & Highways" },
  { email: "sanitation@civicconnect.gov", department: "Sanitation" },
  { email: "streetlights@civicconnect.gov", department: "Electrical Maintenance" },
  { email: "waterworks@civicconnect.gov", department: "Water & Drainage" },
  { email: "parks@civicconnect.gov", department: "Parks & Public Spaces" },
  { email: "encroachment@civicconnect.gov", department: "Town Planning & Encroachment" },
  { email: "noise@civicconnect.gov", department: "Pollution Control" }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing official list to keep seed clean
  await Official.deleteMany({});
  console.log('Cleared existing officials.');

  for (const o of officials) {
    await Official.findOneAndUpdate({ email: o.email }, o, { upsert: true, new: true });
    console.log(`✅ Seeded official: ${o.email} -> ${o.department}`);
  }

  console.log('Done! Official accounts seeded.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
