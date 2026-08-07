const Complaint = require('../models/Complaint');
const Official = require('../models/Official');

const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * GET /api/stats
 * Returns complaint counts by status.
 * (If logged-in user is an official, counts are strictly scoped to their assigned department)
 */
const getStats = async (req, res) => {
  let filter = {};
  let assignedDept = req.user?.department;

  // Resolve department from Official collection if not present on req.user
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

  // Filter strictly by department for officials
  if ((req.user?.role === 'official' || assignedDept) && assignedDept) {
    const regex = new RegExp(escapeRegex(assignedDept), 'i');
    filter.department = { $regex: regex };
  }

  const [total, pending, assigned, inProgress, resolved] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: 'Pending' }),
    Complaint.countDocuments({ ...filter, status: 'Assigned' }),
    Complaint.countDocuments({ ...filter, status: 'In Progress' }),
    Complaint.countDocuments({ ...filter, status: 'Resolved' }),
  ]);

  res.json({ total, pending, assigned, inProgress, resolved, department: assignedDept || null });
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
