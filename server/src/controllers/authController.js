const Official = require('../models/Official');
const User = require('../models/User');

/**
 * POST /api/auth/login
 * Called immediately after Supabase sign-in.
 * Returns the user's role and profile.
 */
const login = async (req, res) => {
  // req.user is already set by the authenticate middleware
  const user = req.user;

  // If this is a returning user who was previously a citizen but now
  // has their email added to officials, sync the role.
  const official = await Official.findOne({ email: user.email.toLowerCase() });
  if (official && user.role !== 'official') {
    user.role = 'official';
    user.department = official.department;
    await user.save();
  }

  res.json({
    id: user._id,
    email: user.email,
    role: user.role,
    department: user.department,
  });
};

module.exports = { login };
