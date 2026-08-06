require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// Bengaluru city center: 12.9716° N, 77.5946° E
const BASE_LAT = 12.9716;
const BASE_LNG = 77.5946;

const sampleComplaints = [
  {
    title: 'Large pothole on MG Road near Brigade junction',
    description:
      'A deep pothole approximately 3 feet wide has formed on MG Road near Brigade junction. It poses a significant risk to two-wheelers and has already caused two accidents this week.',
    category: 'Roads & Highways',
    department: 'Roads & Highways',
    severity: 'High',
    status: 'Pending',
    latOffset: 0.012,
    lngOffset: 0.008,
  },
  {
    title: 'Overflowing garbage bins near Koramangala 5th Block',
    description:
      'Municipal garbage bins at Koramangala 5th Block have not been emptied for 4 days. Waste is overflowing onto the footpath creating a severe sanitation hazard.',
    category: 'Sanitation',
    department: 'Sanitation',
    severity: 'High',
    status: 'Assigned',
    latOffset: -0.025,
    lngOffset: 0.031,
  },
  {
    title: 'Street light out on Indiranagar 100 Feet Road',
    description:
      'Two consecutive street lights on Indiranagar 100 Feet Road have been non-functional for the past 10 days. The area is very dark at night creating safety concerns.',
    category: 'Electrical Maintenance',
    department: 'Electrical Maintenance',
    severity: 'Medium',
    status: 'In Progress',
    latOffset: 0.035,
    lngOffset: 0.022,
  },
  {
    title: 'Sewage overflow on HSR Layout Sector 6',
    description:
      'A sewage manhole near HSR Layout Sector 6 is overflowing onto the road. The foul smell is affecting nearby residents and shops. Immediate attention required.',
    category: 'Water & Drainage',
    department: 'Water & Drainage',
    severity: 'Critical',
    status: 'Pending',
    latOffset: -0.045,
    lngOffset: -0.015,
  },
  {
    title: 'Damaged footpath near Lalbagh West Gate',
    description:
      'The footpath tiles near Lalbagh West Gate are broken and uplifted. Pedestrians, especially elderly visitors, are at risk of tripping and injuring themselves.',
    category: 'Roads & Highways',
    department: 'Roads & Highways',
    severity: 'Medium',
    status: 'Resolved',
    latOffset: -0.015,
    lngOffset: -0.028,
  },
  {
    title: 'Illegal encroachment blocking footpath on Commercial Street',
    description:
      'A vendor has erected a permanent structure on the public footpath near Commercial Street, completely blocking pedestrian movement and forcing people to walk on the road.',
    category: 'Town Planning & Encroachment',
    department: 'Town Planning & Encroachment',
    severity: 'Medium',
    status: 'Pending',
    latOffset: 0.018,
    lngOffset: -0.005,
  },
  {
    title: 'Open drain near Whitefield Main Road',
    description:
      'An uncovered drain near Whitefield Main Road is a serious safety hazard, especially for children. Mosquito breeding is also a concern for the surrounding residential area.',
    category: 'Water & Drainage',
    department: 'Water & Drainage',
    severity: 'High',
    status: 'Assigned',
    latOffset: 0.055,
    lngOffset: 0.065,
  },
  {
    title: 'Park benches damaged in Cubbon Park',
    description:
      'Several benches in Cubbon Park near the entry gate have broken wooden planks. The metal frames with exposed sharp edges are dangerous for visitors.',
    category: 'Parks & Public Spaces',
    department: 'Parks & Public Spaces',
    severity: 'Low',
    status: 'Pending',
    latOffset: 0.008,
    lngOffset: -0.012,
  },
  {
    title: 'Loud construction noise past midnight in Jayanagar',
    description:
      'A construction site in Jayanagar 4th Block is operating heavy machinery past midnight daily, violating noise pollution norms and disturbing the sleep of residents.',
    category: 'Pollution Control',
    department: 'Pollution Control',
    severity: 'Medium',
    status: 'Pending',
    latOffset: -0.033,
    lngOffset: -0.025,
  },
  {
    title: 'Water supply disruption in Rajajinagar for 3 days',
    description:
      'Residents of Rajajinagar 1st Block have had no water supply for the past 3 days. BWSSB officials have not responded to multiple calls and complaints.',
    category: 'Water & Drainage',
    department: 'Water & Drainage',
    severity: 'Critical',
    status: 'In Progress',
    latOffset: 0.022,
    lngOffset: -0.042,
  },
  {
    title: 'Garbage dumping on Marathahalli Bridge underpass',
    description:
      'The underpass beneath Marathahalli Bridge has been turned into an illegal garbage dump. The stench and unhygienic conditions are affecting commuters and nearby shops.',
    category: 'Sanitation',
    department: 'Sanitation',
    severity: 'High',
    status: 'Pending',
    latOffset: 0.048,
    lngOffset: 0.055,
  },
  {
    title: 'Non-functional traffic signal at Silk Board Junction',
    description:
      'The traffic signal at Silk Board Junction has been malfunctioning for 2 days, showing all red constantly. This is causing massive traffic congestion and near-miss accidents.',
    category: 'Roads & Highways',
    department: 'Roads & Highways',
    severity: 'Critical',
    status: 'Assigned',
    latOffset: -0.038,
    lngOffset: 0.018,
  },
  {
    title: 'Street light pole leaning dangerously in Banaswadi',
    description:
      'A concrete street light pole in Banaswadi has tilted at a dangerous angle after recent rains. It is at risk of falling on pedestrians or vehicles.',
    category: 'Electrical Maintenance',
    department: 'Electrical Maintenance',
    severity: 'Critical',
    status: 'Resolved',
    latOffset: 0.042,
    lngOffset: -0.019,
  },
  {
    title: 'Road cave-in near Hebbal flyover approach',
    description:
      'A section of road near the Hebbal flyover approach has caved in, creating a 4-foot deep hole. Heavy vehicles have been narrowly avoiding it. Immediate repair required.',
    category: 'Roads & Highways',
    department: 'Roads & Highways',
    severity: 'Critical',
    status: 'In Progress',
    latOffset: 0.062,
    lngOffset: -0.005,
  },
  {
    title: 'Defunct public toilet near KR Market',
    description:
      'The public toilet facility near KR Market has been non-functional for over a week. Vendors and visitors have no sanitation facility, causing open defecation in the area.',
    category: 'Sanitation',
    department: 'Sanitation',
    severity: 'High',
    status: 'Pending',
    latOffset: -0.008,
    lngOffset: -0.018,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing complaints to re-seed cleanly
  await Complaint.deleteMany({});
  console.log('Cleared existing complaints.');

  let demoUser = await User.findOne({ email: 'citizen.demo@civisync.demo' });
  if (!demoUser) {
    demoUser = await User.create({
      firebase_uid: 'demo-citizen-seed-uid',
      email: 'citizen.demo@civisync.demo',
      role: 'citizen',
    });
  }

  let created = 0;
  for (const c of sampleComplaints) {
    const { latOffset, lngOffset, ...data } = c;
    await Complaint.create({
      ...data,
      latitude: BASE_LAT + latOffset,
      longitude: BASE_LNG + lngOffset,
      created_by: demoUser._id,
      support_count: Math.floor(Math.random() * 25),
    });
    created++;
    console.log(`✅ Created: ${data.title}`);
  }

  console.log(`\n🎉 Seeded ${created} complaints with Pollution Control department.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
