const Complaint = require('../models/Complaint');
const Official = require('../models/Official');
const mongoose = require('mongoose');

const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * Helper to build department query filter for officials.
 * If user is an official, forces department filter to their assigned department.
 */
const applyDepartmentScope = async (req, filter) => {
  let assignedDept = req.user?.department;

  if (req.user?.email && (!assignedDept || req.user.role !== 'official')) {
    const official = await Official.findOne({
      email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') },
    });
    if (official) {
      assignedDept = official.department;
      if (req.user) {
        req.user.role = 'official';
        req.user.department = official.department;
      }
    }
  }

  if (assignedDept) {
    const regex = new RegExp(escapeRegex(assignedDept), 'i');
    filter.department = { $regex: regex };
  } else if (req.query.department) {
    filter.department = req.query.department;
  }
};

/**
 * POST /api/complaints
 * Create a new complaint (citizen)
 */
const createComplaint = async (req, res) => {
  const {
    title,
    description,
    category,
    department,
    severity,
    image_url,
    latitude,
    longitude,
  } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Location coordinates are required' });
  }

  const complaint = await Complaint.create({
    title,
    description,
    category,
    department,
    severity,
    image_url,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    created_by: req.user._id,
  });

  res.status(201).json(complaint);
};

/**
 * GET /api/complaints
 * List all complaints with search, filters, sort, and pagination
 * (Officials are strictly scoped to their assigned department)
 */
const getComplaints = async (req, res) => {
  const {
    search,
    status,
    category,
    page = 1,
    limit = 10,
    sort = '-created_at',
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  // Enforce department scoping for officials
  await applyDepartmentScope(req, filter);

  if (search) {
    const searchConditions = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    if (filter.$or) {
      const deptConditions = filter.$or;
      delete filter.$or;
      filter.$and = [
        { $or: deptConditions },
        { $or: searchConditions },
      ];
    } else {
      filter.$or = searchConditions;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('created_by', 'email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Complaint.countDocuments(filter),
  ]);

  res.json({
    complaints,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
};

/**
 * GET /api/complaints/nearby
 * Return complaints within ~5km of given lat/lng (citizen dashboard)
 */
const getNearbyComplaints = async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusKm = parseFloat(radius);

  // Approximate degree delta for given km radius
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((latNum * Math.PI) / 180));

  const complaints = await Complaint.find({
    status: { $ne: 'Resolved' },
    latitude: { $gte: latNum - latDelta, $lte: latNum + latDelta },
    longitude: { $gte: lngNum - lngDelta, $lte: lngNum + lngDelta },
  })
    .sort('-created_at')
    .limit(20)
    .populate('created_by', 'email');

  // Attach distance in km to each
  const withDistance = complaints.map((c) => {
    const dLat = ((c.latitude - latNum) * Math.PI) / 180;
    const dLng = ((c.longitude - lngNum) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((latNum * Math.PI) / 180) *
        Math.cos((c.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...c.toObject(), distanceKm: Math.round(distKm * 10) / 10 };
  });

  res.json(withDistance);
};

/**
 * GET /api/complaints/mine
 * Complaints submitted by the logged-in citizen
 */
const getMyComplaints = async (req, res) => {
  const { status, page = 1, limit = 12 } = req.query;
  const filter = { created_by: req.user._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [complaints, total] = await Promise.all([
    Complaint.find(filter).sort('-created_at').skip(skip).limit(parseInt(limit)),
    Complaint.countDocuments(filter),
  ]);

  res.json({ complaints, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
};

/**
 * GET /api/complaints/all-map
 * All complaints for map display (Officials strictly scoped to assigned department)
 */
const getAllForMap = async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) filter.category = category;

  // Enforce department scoping for officials
  await applyDepartmentScope(req, filter);

  const complaints = await Complaint.find(filter).select(
    'title status latitude longitude category department support_count'
  );
  res.json(complaints);
};

/**
 * GET /api/complaints/:id
 * Single complaint with creator info
 */
const getComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate(
    'created_by',
    'email'
  );
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
  res.json(complaint);
};

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status — officials only (scoped to official's department)
 */
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  // Enforce department authorization for officials
  if (req.user && req.user.role === 'official' && req.user.department) {
    const userDeptLower = req.user.department.toLowerCase();
    const complaintDeptLower = (complaint.department || '').toLowerCase();
    
    // Allow match if department string contains or matches assigned department
    const isMatch = complaintDeptLower.includes(userDeptLower) || userDeptLower.includes(complaintDeptLower);
    if (!isMatch) {
      return res.status(403).json({
        message: `Forbidden: You are only authorized to manage complaints for '${req.user.department}'`,
      });
    }
  }

  complaint.status = status;
  complaint.updated_at = new Date();
  await complaint.save();

  await complaint.populate('created_by', 'email');
  res.json(complaint);
};

/**
 * POST /api/complaints/:id/support
 * Toggle support for a complaint — citizens only
 */
const toggleSupport = async (req, res) => {
  const userId = req.user._id;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  const alreadySupported = complaint.supporters.some(
    (id) => id.toString() === userId.toString()
  );

  if (alreadySupported) {
    complaint.supporters = complaint.supporters.filter(
      (id) => id.toString() !== userId.toString()
    );
    complaint.support_count = Math.max(0, complaint.support_count - 1);
  } else {
    complaint.supporters.push(userId);
    complaint.support_count += 1;
  }

  await complaint.save();
  res.json({ support_count: complaint.support_count, supported: !alreadySupported });
};

/**
 * POST /api/complaints/check-duplicates
 * Check for active complaints with same category within 50m radius
 */
const checkDuplicates = async (req, res) => {
  const { category, latitude, longitude } = req.body;

  if (!category || !latitude || !longitude) {
    return res.status(400).json({ message: 'category, latitude, and longitude are required' });
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const radiusKm = 0.05; // 50 metres

  // Approximate degree delta for 50m
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((latNum * Math.PI) / 180));

  const duplicates = await Complaint.find({
    category,
    status: { $in: ['Pending', 'Assigned', 'In Progress'] },
    latitude: { $gte: latNum - latDelta, $lte: latNum + latDelta },
    longitude: { $gte: lngNum - lngDelta, $lte: lngNum + lngDelta },
  })
    .select('title image_url status latitude longitude support_count supporters')
    .sort('-support_count')
    .limit(5);

  res.json(duplicates);
};

/**
 * DELETE /api/complaints/:id
 * Delete a complaint (creator or authorized official)
 */
const deleteComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

  const userId = req.user._id.toString();
  const createdBy = (complaint.created_by._id || complaint.created_by).toString();
  const isOwner = createdBy === userId;
  const isOfficial = req.user.role === 'official';

  if (!isOwner && !isOfficial) {
    return res.status(403).json({ message: 'Forbidden: You can only delete your own complaints' });
  }

  if (isOfficial && req.user.department && !isOwner) {
    const userDeptLower = req.user.department.toLowerCase();
    const complaintDeptLower = (complaint.department || '').toLowerCase();
    const isMatch = complaintDeptLower.includes(userDeptLower) || userDeptLower.includes(complaintDeptLower);
    if (!isMatch) {
      return res.status(403).json({
        message: `Forbidden: You are only authorized to delete complaints for '${req.user.department}'`,
      });
    }
  }

  await Complaint.findByIdAndDelete(req.params.id);
  res.json({ message: 'Complaint deleted successfully' });
};

module.exports = {
  createComplaint,
  getComplaints,
  getNearbyComplaints,
  getMyComplaints,
  getAllForMap,
  getComplaint,
  updateStatus,
  toggleSupport,
  checkDuplicates,
  deleteComplaint,
};
