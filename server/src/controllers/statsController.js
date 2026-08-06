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

  if (req.user && req.user.role === 'official') {
    let dept = req.user.department;

    if (!dept && req.user.email) {
      const official = await Official.findOne({
        email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') },
      });
      if (official) dept = official.department;
    }

    if (dept) {
      const regex = new RegExp(escapeRegex(dept), 'i');
      filter = {
        $or: [
          { department: { $regex: regex } },
          { category: { $regex: regex } },
        ],
      };
    }
  }

  const [total, pending, assigned, inProgress, resolved] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: 'Pending' }),
    Complaint.countDocuments({ ...filter, status: 'Assigned' }),
    Complaint.countDocuments({ ...filter, status: 'In Progress' }),
    Complaint.countDocuments({ ...filter, status: 'Resolved' }),
  ]);

  res.json({ total, pending, assigned, inProgress, resolved, department: req.user?.department || null });
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
