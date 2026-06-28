const mongoose = require('mongoose');

// These must match the four mood-card categories already on the public
// site exactly (Dakeiro.html #gallery section) — the frontend maps photos
// to cards by this string, so a typo here means a photo silently never
// shows up anywhere.
const CATEGORIES = [
  'Bridal Artistry',
  'Hair & Colour',
  'Skin & Glow',
  'Spa Rituals',
];

const galleryItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category selected' },
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [120, 'Caption cannot exceed 120 characters'],
      default: undefined,
    },
    // Inactive items are hidden from the public site but kept in the
    // database, same pattern as Staff — lets the owner temporarily hide
    // a photo without losing it.
    active: {
      type: Boolean,
      default: true,
    },
    // Within a category, lower displayOrder shows first. If the owner
    // uploads multiple photos for "Bridal Artistry", this controls which
    // one is treated as the "main" card image (displayOrder: 0).
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

galleryItemSchema.index({ category: 1, active: 1, displayOrder: 1 });

module.exports = mongoose.model('GalleryItem', galleryItemSchema);
module.exports.CATEGORIES = CATEGORIES;
