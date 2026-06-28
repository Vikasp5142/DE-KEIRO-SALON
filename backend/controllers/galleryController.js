const GalleryItem = require('../models/GalleryItem');
const { CATEGORIES } = require('../models/GalleryItem');

/* ─────────────────────────────────────────────────────
   GET /api/gallery
   Public — used by the four mood cards on the homepage.
   Returns the single lowest-displayOrder ACTIVE item per
   category, since each public mood card has exactly one
   photo slot. Categories with no active item simply don't
   appear in the response — the frontend already has a
   built-in SVG illustration fallback for that case, so a
   missing category here is never an error, just "no real
   photo yet for this one."
───────────────────────────────────────────────────── */
exports.getPrimaryGallery = async (req, res) => {
  try {
    const items = await Promise.all(
      CATEGORIES.map((category) =>
        GalleryItem.findOne({ category, active: true })
          .sort({ displayOrder: 1 })
          .lean()
      )
    );
    const data = items.filter(Boolean); // drop categories with nothing active
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[getPrimaryGallery]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch gallery.' });
  }
};

/* ─────────────────────────────────────────────────────
   GET /api/gallery/all   (admin only)
   Every item, active or not, for the admin dashboard.
───────────────────────────────────────────────────── */
exports.getAllGalleryItems = async (req, res) => {
  try {
    const items = await GalleryItem.find({}).sort({ category: 1, displayOrder: 1 }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[getAllGalleryItems]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch gallery items.' });
  }
};

/* ─────────────────────────────────────────────────────
   POST /api/gallery   (admin only)
───────────────────────────────────────────────────── */
exports.createGalleryItem = async (req, res) => {
  try {
    const { category, imageUrl, caption, displayOrder } = req.body;
    const item = await GalleryItem.create({
      category,
      imageUrl,
      caption: caption || undefined,
      displayOrder: displayOrder !== undefined && displayOrder !== '' ? Number(displayOrder) : 0,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' · ') });
    }
    console.error('[createGalleryItem]', err);
    return res.status(500).json({ success: false, message: 'Could not add gallery item.' });
  }
};

/* ─────────────────────────────────────────────────────
   PATCH /api/gallery/:id   (admin only)
───────────────────────────────────────────────────── */
exports.updateGalleryItem = async (req, res) => {
  try {
    const allowed = ['category', 'imageUrl', 'caption', 'active', 'displayOrder'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    const item = await GalleryItem.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    return res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' · ') });
    }
    console.error('[updateGalleryItem]', err);
    return res.status(500).json({ success: false, message: 'Could not update gallery item.' });
  }
};

/* ─────────────────────────────────────────────────────
   DELETE /api/gallery/:id   (admin only)
───────────────────────────────────────────────────── */
exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await GalleryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    return res.json({ success: true, message: 'Gallery item deleted.' });
  } catch (err) {
    console.error('[deleteGalleryItem]', err);
    return res.status(500).json({ success: false, message: 'Could not delete gallery item.' });
  }
};
