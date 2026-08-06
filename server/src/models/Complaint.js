const mongoose = require('mongoose');

const DEPARTMENTS = [
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
  // Legacy compatibility fallbacks
  'Environmental Health',
  'General Administration',
  'Roads & Potholes',
  'Garbage & Sanitation',
  'Street Lighting',
  'Public Works Department',
  'Solid Waste Management',
  'Electrical Department',
  'Water Supply & Sewerage Board',
  'Parks & Gardens Department',
  'Revenue Department',
  'Pollution Control Board',
  'Other',
];

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: DEPARTMENTS,
    },
    department: {
      type: String,
      required: true,
      enum: DEPARTMENTS,
    },
    severity: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    image_url: { type: String, default: null },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    support_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Geo index for nearby queries
complaintSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
