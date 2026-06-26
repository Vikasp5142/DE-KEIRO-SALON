const mongoose = require('mongoose');

const SPECIALTIES = [
  'Hair & Styling',
  'Hair Colour & Treatments',
  'Skin & Facials',
  'Bridal Makeup',
  'Spa & Massage',
  'Nails',
  'Waxing & Threading',
  "Men's Grooming",
  'All-Rounder',
];

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      enum: { values: SPECIALTIES, message: 'Invalid specialty selected' },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: undefined,
    },
    yearsExperience: {
      type: Number,
      min: 0,
      max: 60,
      default: undefined,
    },
    // Optional photo URL. If not set, the frontend shows an initials avatar
    // instead — no broken-image risk, same lesson learned from the gallery.
    photoUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    // Inactive staff are hidden from the public site and booking form, but
    // kept in the database so past bookings still resolve a name correctly.
    active: {
      type: Boolean,
      default: true,
    },
    // Controls sort order on the public "Our Team" grid (ascending).
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

staffSchema.index({ active: 1, displayOrder: 1 });

module.exports = mongoose.model('Staff', staffSchema);
module.exports.SPECIALTIES = SPECIALTIES;
