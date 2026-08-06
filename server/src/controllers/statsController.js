const Complaint = require('../models/Complaint');

/**
 * GET /api/stats
 * Returns complaint counts by status.
 * (If logged-in user is an official, counts are strictly scoped to their assigned department)
 */
const getStats = async (req, res) => {
  const filter = {};

  if (req.user && req.user.role === 'official' && req.user.department) {
    filter.department = { $regex: new RegExp(req.user.department, 'i') };
  }

  const [total, pending, assigned, inProgress, resolved] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: 'Pending' }),
    Complaint.countDocuments({ ...filter, status: 'Assigned' }),
    Complaint.countDocuments({ ...filter, status: 'In Progress' }),
    Complaint.countDocuments({ ...filter, status: 'Resolved' }),
  ]);

  res.json({ total, pending, assigned, inProgress, resolved });
};

/**
 * GET /api/stats/mine
 * Returns complaint counts for the logged-in citizen.
 */
const getMyStats = async (req, res) => {
  const userId = req.user._id;
  const [total, pending, inProgress, resolved] = await Promise.all([
    Complaint.countDocuments({ created_by: userId }),
    Complaint.countDocuments({ created_by: userId, status: 'Pending' }),
    Complaint.countDocuments({ created_by: userId, status: 'In Progress' }),
    Complaint.countDocuments({ created_by: userId, status: 'Resolved' }),
  ]);

  res.json({ total, pending, inProgress, resolved });
};

module.exports = { getStats, getMyStats };
