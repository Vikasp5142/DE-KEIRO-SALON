const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/staffController');
const adminOnly = require('../middleware/requireAdminKey');

// ── Public route — "Our Team" section + booking form dropdown ──
router.get('/',            ctrl.getActiveStaff);   // GET /api/staff

// ── Admin-only routes ──
router.get('/all',         adminOnly, ctrl.getAllStaff);    // GET    /api/staff/all
router.post('/',           adminOnly, ctrl.createStaff);    // POST   /api/staff
router.patch('/:id',       adminOnly, ctrl.updateStaff);    // PATCH  /api/staff/:id
router.delete('/:id',      adminOnly, ctrl.deleteStaff);    // DELETE /api/staff/:id

module.exports = router;
