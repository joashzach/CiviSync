/**
 * Middleware to restrict routes to officials only.
 * Must be used AFTER the authenticate middleware.
 */
const requireOfficial = (req, res, next) => {
  if (!req.user || req.user.role !== 'official') {
    return res.status(403).json({ message: 'Access restricted to officials' });
  }
  next();
};

module.exports = requireOfficial;
