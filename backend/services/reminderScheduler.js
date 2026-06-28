/**
 * Reminder scheduler — no external cron dependency. setInterval is enough
 * for an hourly check on a single long-running Node process (which is what
 * this backend already is on Render); a real cron library would be
 * overkill and adds a dependency for no real benefit at this scale.
 *
 * Runs an hourly sweep: find every CONFIRMED booking whose appointment
 * falls within the next REMINDER_WINDOW_HOURS, hasn't already had a
 * reminder sent, and isn't in the past — then sends a WhatsApp reminder
 * and marks it so it's never sent twice.
 */

const Booking = require('../models/Booking');
const whatsapp = require('./whatsapp');

const REMINDER_WINDOW_HOURS = 3; // remind ~3 hours before the appointment
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check once per hour

// preferredDate is stored as a Date (midnight, per createBooking) and
// preferredTime as a separate "HH:MM" string — this combines them into
// the actual appointment moment.
//
// Deliberately NOT using Date.setHours() here: that method interprets the
// hour/minute in whatever timezone the Node *process* is running in — on
// Render that's UTC by default, not IST. Using setHours would silently
// treat "14:30" as 14:30 UTC (= 8:00 PM IST) instead of the 14:30 IST the
// customer actually selected, sending every reminder 5.5 hours off from
// the real appointment time. Instead, this builds the UTC instant that
// directly corresponds to the intended IST wall-clock time, with the
// fixed +5:30 offset applied explicitly. IST has no daylight saving, so a
// fixed offset is safe and doesn't need a timezone library.
function getAppointmentDateTime(booking) {
  const dateStr = new Date(booking.preferredDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const [hours, minutes] = (booking.preferredTime || '00:00').split(':').map(Number);
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  const utcMinutesFromMidnight = hours * 60 + minutes - IST_OFFSET_MINUTES;
  const result = new Date(`${dateStr}T00:00:00.000Z`);
  result.setUTCMinutes(result.getUTCMinutes() + utcMinutesFromMidnight);
  return result;
}

async function runReminderSweep() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  try {
    // Broad DB-level filter first (status + not yet reminded + roughly the
    // right day), then the precise hour-level check happens in JS below via
    // the IST-aware getAppointmentDateTime — doing exact timezone math
    // inside a Mongo query would be awkward given preferredDate/
    // preferredTime are separate fields. The lower bound here is
    // deliberately one full day earlier than "today" by the server's
    // clock: near midnight IST, the server's notion of "today" (likely
    // UTC) can differ from IST's "today" by a few hours, and this margin
    // means we never accidentally exclude a real candidate — the precise
    // appointmentAt check below is what actually decides who gets a
    // reminder, this query just needs to not be too narrow.
    const oneDayBeforeServerToday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const candidates = await Booking.find({
      status: 'confirmed',
      reminderSentAt: { $exists: false },
      preferredDate: { $gte: oneDayBeforeServerToday, $lte: windowEnd },
    });

    let sent = 0;
    for (const booking of candidates) {
      const appointmentAt = getAppointmentDateTime(booking);
      if (appointmentAt > now && appointmentAt <= windowEnd) {
        const result = await whatsapp.sendBookingReminder(booking);
        if (result.sent) {
          booking.reminderSentAt = new Date();
          await booking.save();
          sent++;
        }
      }
    }

    if (sent > 0) {
      console.log(`[reminderScheduler] Sent ${sent} reminder(s) this sweep.`);
    }
  } catch (err) {
    // A failed sweep must never crash the server — log and let the next
    // hourly tick try again.
    console.error('[reminderScheduler] Sweep failed:', err.message);
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return; // already running, don't double-start
  console.log(`[reminderScheduler] Starting — checking every hour for bookings within ${REMINDER_WINDOW_HOURS}h of their appointment.`);
  // Run once shortly after startup (catches anything due soon, rather than
  // waiting a full hour after every deploy), then on the regular interval.
  setTimeout(runReminderSweep, 30 * 1000);
  intervalHandle = setInterval(runReminderSweep, CHECK_INTERVAL_MS);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { start, stop, runReminderSweep, getAppointmentDateTime };
