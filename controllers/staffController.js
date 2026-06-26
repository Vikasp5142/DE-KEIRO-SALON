const Staff = require('../models/Staff');
const Booking = require('../models/Booking');

/* ─────────────────────────────────────────────────────
   GET /api/staff
   Public — used by the "Our Team" section and the
   booking form's stylist dropdown. Active staff only,
   sorted for display.
───────────────────────────────────────────────────── */
exports.getActiveStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ active: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return res.json({ success: true, data: staff });
  } catch (err) {
    console.error('[getActiveStaff]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch staff.' });
  }
};

/* ─────────────────────────────────────────────────────
   GET /api/staff/all   (admin only)
   Returns every staff record, active or not, so the
   admin dashboard can re-activate someone later.
───────────────────────────────────────────────────── */
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find({}).sort({ displayOrder: 1, name: 1 }).lean();
    return res.json({ success: true, data: staff });
  } catch (err) {
    console.error('[getAllStaff]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch staff.' });
  }
};

/* ─────────────────────────────────────────────────────
   POST /api/staff   (admin only)
───────────────────────────────────────────────────── */
exports.createStaff = async (req, res) => {
  try {
    const { name, specialty, bio, yearsExperience, photoUrl, displayOrder } = req.body;
    const staff = await Staff.create({
      name,
      specialty,
      bio: bio || undefined,
      yearsExperience: yearsExperience !== undefined && yearsExperience !== '' ? Number(yearsExperience) : undefined,
      photoUrl: photoUrl || undefined,
      displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : 0,
    });
    return res.status(201).json({ success: true, data: staff });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' · ') });
    }
    console.error('[createStaff]', err);
    return res.status(500).json({ success: false, message: 'Could not create staff member.' });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/staff/:id   (admin only)
   Body: any subset of { name, specialty, bio, yearsExperience,
                          photoUrl, active, displayOrder }
───────────────────────────────────────────────────── */
exports.updateStaff = async (req, res) => {
  try {
    const allowed = ['name', 'specialty', 'bio', 'yearsExperience', 'photoUrl', 'active', 'displayOrder'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    const staff = await Staff.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
    return res.json({ success: true, data: staff });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' · ') });
    }
    console.error('[updateStaff]', err);
    return res.status(500).json({ success: false, message: 'Could not update staff member.' });
  }
};

/* ─────────────────────────────────────────────────────
   DELETE /api/staff/:id   (admin only)
   Hard delete. Bookings keep their stylistName snapshot,
   so historical records are unaffected — only stylistId
   becomes a dangling reference, which the frontend never
   dereferences directly (it always reads stylistName).
───────────────────────────────────────────────────── */
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
    return res.json({ success: true, message: 'Staff member deleted.' });
  } catch (err) {
    console.error('[deleteStaff]', err);
    return res.status(500).json({ success: false, message: 'Could not delete staff member.' });
  }
};
