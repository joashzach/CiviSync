const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const requireOfficial = require('../middleware/requireOfficial');
const {
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
} = require('../controllers/complaintController');

// Citizen routes
router.post('/', authenticate, createComplaint);
router.get('/nearby', authenticate, getNearbyComplaints);
router.get('/mine', authenticate, getMyComplaints);
router.get('/all-map', authenticate, getAllForMap);
router.post('/check-duplicates', authenticate, checkDuplicates);
router.post('/:id/support', authenticate, toggleSupport);

// Shared
router.get('/:id', authenticate, getComplaint);
router.delete('/:id', authenticate, deleteComplaint);

// Official-only routes
router.get('/', authenticate, requireOfficial, getComplaints);
router.patch('/:id/status', authenticate, requireOfficial, updateStatus);

module.exports = router;
