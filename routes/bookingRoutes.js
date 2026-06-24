const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/bookingController');
const adminOnly = require('../middleware/requireAdminKey');

// ── Public route — anyone on the website can submit a booking ──
router.post('/',           ctrl.createBooking);

// ── Admin-only routes — require x-admin-key header ──
router.get('/stats',       adminOnly, ctrl.getStats);         // GET  /api/bookings/stats
router.get('/',            adminOnly, ctrl.getBookings);       // GET  /api/bookings?status=&from=&to=&page=&limit=
router.get('/:id',         adminOnly, ctrl.getBookingById);   // GET  /api/bookings/:id
router.patch('/:id',       adminOnly, ctrl.updateBooking);    // PATCH /api/bookings/:id  { status, adminNote }
router.delete('/:id',      adminOnly, ctrl.deleteBooking);    // DELETE /api/bookings/:id

module.exports = router;