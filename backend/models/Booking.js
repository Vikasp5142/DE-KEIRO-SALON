const mongoose = require('mongoose');

const SERVICES = [
  'Haircut & Styling',
  'Hair Spa',
  'Hair Colour & Treatments',
  'Facial & Skin Care',
  'Body Spa & Massage',
  'Manicure & Pedicure',
  'Nail Art & Extensions',
  'Waxing & Threading',
  "Men's Grooming",
  'Classic Pre-Bridal Package',
  'Elite Pre-Bridal Package',
  'Royal Pre-Bridal Package',
  'Other / Not Sure',
];

const bookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
      default: undefined,
    },
    service: {
      type: String,
      required: [true, 'Please select a service'],
      enum: { values: SERVICES, message: 'Invalid service selected' },
    },
    preferredDate: {
      type: Date,
      required: [true, 'Preferred date is required'],
    },
    preferredTime: {
      type: String,
      required: [true, 'Preferred time is required'],
      match: [/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: undefined,
    },
    // Stylist selection is optional — customers can pick "No preference".
    // stylistName is a denormalized snapshot taken at booking time, so a
    // booking still shows a sensible name even if that staff member is
    // later renamed, deactivated, or removed from the Staff collection.
    stylistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: undefined,
    },
    stylistName: {
      type: String,
      trim: true,
      default: 'No preference',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    // Set once the reminder scheduler successfully sends a WhatsApp
    // reminder for this booking — checked on every scheduler tick so the
    // same booking never gets reminded twice, even if the scheduler runs
    // more often than once per booking's reminder window.
    reminderSentAt: {
      type: Date,
      default: undefined,
    },
    // Track where the booking came from (website, WhatsApp, walk-in, phone)
    source: {
      type: String,
      enum: ['website', 'phone', 'walkin', 'whatsapp'],
      default: 'website',
    },
    // Internal note added by admin
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },
  },
  {
    timestamps: true,   // createdAt / updatedAt
    versionKey: false,
  }
);

// Index for common admin queries
bookingSchema.index({ status: 1, preferredDate: 1 });
bookingSchema.index({ phone: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);