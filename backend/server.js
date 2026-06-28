// Load .env into process.env for local development.
// On Render/Railway this is a no-op (no .env file there) since those
// platforms inject variables directly — but locally, without this line,
// process.env.MONGODB_URI / ADMIN_KEY are simply undefined.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors()); // TODO before launch: restrict to your real domain — see README "Security notes"
app.use(express.json());

// Simple request log so you can SEE bookings arrive in the server console/logs.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Health check — hit this in a browser to confirm the API is alive at all.
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Da Keiro Studiio API is running.' });
});

app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));

// Catch-all for unknown routes, returned as JSON (not Express's default HTML
// 404 page) — this is what was causing the frontend's "Server returned HTML
// instead of JSON" error whenever API_BASE pointed somewhere that didn't
// have this exact route mounted.
app.use((req, res) => {
  res.status(404).json({ success: false, message: `No route: ${req.method} ${req.originalUrl}` });
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not set. Did you create a .env file from .env.example?');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
    // Only start once the DB is actually connected — the scheduler queries
    // the Booking collection on every tick, so starting it earlier would
    // just throw on its first run.
    require('./services/reminderScheduler').start();
  })
  .catch((err) => {
    console.error('✕ MongoDB connection failed:', err.message);
    process.exit(1);
  });