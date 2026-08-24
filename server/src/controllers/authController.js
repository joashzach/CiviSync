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
  const { name, avatar_url } = req.body || {};

  let changed = false;

  // If this is a returning user who was previously a citizen but now
  // has their email added to officials, sync the role.
  const official = await Official.findOne({ email: user.email.toLowerCase() });
  if (official && user.role !== 'official') {
    user.role = 'official';
    user.department = official.department;
    changed = true;
  }

  if (name && user.name !== name) {
    user.name = name;
    changed = true;
  }

  if (avatar_url && user.avatar_url !== avatar_url) {
    user.avatar_url = avatar_url;
    changed = true;
  }

  if (changed && typeof user.save === 'function') {
    await user.save();
  }

  res.json({
    id: user._id,
    email: user.email,
    name: user.name || null,
    avatar_url: user.avatar_url || null,
    role: user.role,
    department: user.department,
  });
};

module.exports = { login };
