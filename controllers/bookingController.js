const Booking = require('../models/Booking');
const Staff = require('../models/Staff');

/* ─────────────────────────────────────────────────────
   POST /api/bookings
   Public — anyone visiting the website can submit
───────────────────────────────────────────────────── */
exports.createBooking = async (req, res) => {
  try {
    const { name, phone, email, service, preferredDate, preferredTime, notes, stylistId } = req.body;

    // Reject bookings for past dates
    const date = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return res.status(400).json({ success: false, message: 'Preferred date cannot be in the past.' });
    }

    // Resolve stylist selection to a name snapshot. "No preference" (or no
    // selection at all) is a valid, common choice — only look up a staff
    // record if a real id was actually sent. If the id doesn't resolve to
    // an active staff member (e.g. they've since left), we don't fail the
    // booking — we just fall back to "No preference" silently, since the
    // studio will sort out the actual stylist by phone anyway.
    let stylistName = 'No preference';
    let resolvedStylistId = undefined;
    if (stylistId) {
      const staff = await Staff.findOne({ _id: stylistId, active: true }).lean();
      if (staff) {
        stylistName = staff.name;
        resolvedStylistId = staff._id;
      }
    }

    const booking = await Booking.create({
      name,
      phone,
      email:         email || undefined,
      service,
      preferredDate: date,
      preferredTime,
      notes:         notes || undefined,
      source:        'website',
      stylistId:     resolvedStylistId,
      stylistName,
    });

    return res.status(201).json({
      success: true,
      message: 'Booking received! The studio will call to confirm your slot.',
      data: {
        id:            booking._id,
        name:          booking.name,
        service:       booking.service,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        stylistName:   booking.stylistName,
        status:        booking.status,
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' · ') });
    }
    console.error('[createBooking]', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again or call us directly.' });
  }
};

/* ─────────────────────────────────────────────────────
   GET /api/bookings   (admin only)
   Query params:
     status  — filter by status (pending|confirmed|cancelled|completed)
     from    — start date (ISO string)
     to      — end date (ISO string)
     page    — page number (default: 1)
     limit   — results per page (default: 30, max: 100)
───────────────────────────────────────────────────── */
exports.getBookings = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.preferredDate = {};
      if (from) filter.preferredDate.$gte = new Date(from);
      if (to)   filter.preferredDate.$lte = new Date(to);
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ preferredDate: 1, preferredTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    console.error('[getBookings]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch bookings.' });
  }
};

/* ─────────────────────────────────────────────────────
   GET /api/bookings/:id   (admin only)
───────────────────────────────────────────────────── */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error('[getBookingById]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch booking.' });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/bookings/:id   (admin only)
   Body: { status?, adminNote? }
───────────────────────────────────────────────────── */
exports.updateBooking = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const ALLOWED_STATUS = ['pending', 'confirmed', 'cancelled', 'completed'];

    const update = {};
    if (status !== undefined) {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${ALLOWED_STATUS.join(', ')}` });
      }
      update.status = status;
    }
    if (adminNote !== undefined) update.adminNote = adminNote;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error('[updateBooking]', err);
    return res.status(500).json({ success: false, message: 'Could not update booking.' });
  }
};

/* ─────────────────────────────────────────────────────
   DELETE /api/bookings/:id   (admin only)
───────────────────────────────────────────────────── */
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    return res.json({ success: true, message: 'Booking deleted.' });
  } catch (err) {
    console.error('[deleteBooking]', err);
    return res.status(500).json({ success: false, message: 'Could not delete booking.' });
  }
};

/* ─────────────────────────────────────────────────────
   GET /api/bookings/stats   (admin only)
   Returns counts grouped by status + today's bookings
───────────────────────────────────────────────────── */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [statusCounts, todayCount] = await Promise.all([
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.countDocuments({ preferredDate: { $gte: today, $lt: tomorrow } }),
    ]);

    const stats = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
    statusCounts.forEach(({ _id, count }) => { if (_id in stats) stats[_id] = count; });

    return res.json({ success: true, data: { ...stats, todayBookings: todayCount } });
  } catch (err) {
    console.error('[getStats]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch stats.' });
  }
};