/**
 * WhatsApp integration — built directly against Meta's WhatsApp Cloud API.
 *
 * Why direct-to-Meta instead of a BSP (Gupshup/AiSensy/Wati/etc.):
 *   - Free to access; you only pay Meta's own per-message rate, no BSP markup
 *   - At Da Keiro's volume (a handful of bookings/day), that's the cheapest path
 *   - A BSP can always be layered on top later for convenience features
 *     (shared inbox, chatbot builder) — none of that changes this file
 *
 * SAFE-BY-DEFAULT: if the required env vars aren't set, every function here
 * logs what WOULD have been sent and returns successfully, rather than
 * throwing or attempting a real API call. This means the booking-status
 * trigger logic (see bookingController.js) can be deployed and tested today,
 * with zero risk, before a real WhatsApp Business Account exists.
 *
 * IMPORTANT — template messages: WhatsApp only allows freeform outbound
 * text within 24 hours of the customer last messaging you. Outside that
 * window (which is the normal case here — customers book via a web form,
 * they don't message first), every outbound message MUST use a
 * pre-approved message template. You cannot send arbitrary text. The
 * template names below (booking_confirmed, booking_reminder,
 * review_request) are NOT real until you've created and gotten them
 * approved in Meta Business Manager — see backend/README.md for exact
 * steps. Sending with an unapproved template name will fail with a clear
 * error from Meta's API, not silently do nothing.
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

function isConfigured() {
  return Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

// India numbers stored in Booking.phone are inconsistent in format (some
// with +91, some with a leading 0, some plain 10 digits — same issue we
// solved for the customer booking-lookup feature). WhatsApp's API requires
// the full international number with no leading zeros or symbols, e.g.
// "919876543210" — this normalizes any of the stored formats to that.
function toWhatsAppFormat(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  const lastTen = digits.slice(-10);
  if (lastTen.length !== 10) return null; // not a recognizable number, don't guess
  return `91${lastTen}`;
}

/**
 * Sends a pre-approved WhatsApp template message.
 *
 * @param {string} toPhone - raw phone number as stored on the booking (any format)
 * @param {string} templateName - must exactly match an APPROVED template name in Meta Business Manager
 * @param {string} languageCode - template's approved language, e.g. 'en' or 'en_US'
 * @param {string[]} bodyParams - values to fill the template's {{1}}, {{2}}, etc. placeholders, in order
 * @returns {Promise<{sent: boolean, simulated: boolean, error?: string}>}
 */
async function sendTemplateMessage(toPhone, templateName, languageCode, bodyParams = []) {
  const formattedPhone = toWhatsAppFormat(toPhone);
  if (!formattedPhone) {
    console.warn(`[whatsapp] Skipping send — "${toPhone}" doesn't look like a valid 10-digit Indian number.`);
    return { sent: false, simulated: false, error: 'Invalid phone number format' };
  }

  if (!isConfigured()) {
    console.log(
      `[whatsapp] SIMULATED (no credentials configured) — would send template ` +
      `"${templateName}" (${languageCode}) to ${formattedPhone} with params: ${JSON.stringify(bodyParams)}`
    );
    return { sent: true, simulated: true };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })) }]
        : [],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      // Meta's error responses are genuinely informative — e.g. "template
      // not found", "template not approved for this language", "recipient
      // has not opted in" — log the whole thing rather than a generic
      // message, since this is exactly the kind of error you'll hit once
      // while setting up templates for the first time.
      console.error(`[whatsapp] Send failed for ${formattedPhone}:`, JSON.stringify(data));
      return { sent: false, simulated: false, error: data?.error?.message || 'Unknown error from WhatsApp API' };
    }

    console.log(`[whatsapp] Sent "${templateName}" to ${formattedPhone}. Message ID: ${data?.messages?.[0]?.id}`);
    return { sent: true, simulated: false };
  } catch (err) {
    console.error(`[whatsapp] Network error sending to ${formattedPhone}:`, err.message);
    return { sent: false, simulated: false, error: err.message };
  }
}

/* ── Specific message helpers — these are the actual trigger points ── */

// Fires when a booking's status changes to 'confirmed' (see bookingController.js).
// Requires an approved template literally named "booking_confirmed" with a
// body like: "Hi {{1}}, your {{2}} appointment at Da Keiro Studiio on {{3}}
// at {{4}} is confirmed! Reply to this message if you need to change anything."
async function sendBookingConfirmed(booking) {
  return sendTemplateMessage(booking.phone, 'booking_confirmed', 'en', [
    booking.name,
    booking.service,
    new Date(booking.preferredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    booking.preferredTime,
  ]);
}

// Fires from the reminder scheduler (see reminderScheduler.js) a few hours
// before a confirmed booking's appointment time. Requires an approved
// template named "booking_reminder", e.g.: "Hi {{1}}, just a reminder —
// your {{2}} appointment at Da Keiro Studiio is today at {{3}}. See you soon!"
async function sendBookingReminder(booking) {
  return sendTemplateMessage(booking.phone, 'booking_reminder', 'en', [
    booking.name,
    booking.service,
    booking.preferredTime,
  ]);
}

// Fires when a booking's status changes to 'completed'. Requires an
// approved template named "review_request", e.g.: "Hi {{1}}, thank you for
// visiting Da Keiro Studiio! We'd love a quick Google review if you have a
// moment: {{2}}"
async function sendReviewRequest(booking, googleReviewUrl) {
  return sendTemplateMessage(booking.phone, 'review_request', 'en', [
    booking.name,
    googleReviewUrl || 'https://g.page/r/REPLACE_WITH_YOUR_GOOGLE_REVIEW_LINK',
  ]);
}

module.exports = {
  isConfigured,
  toWhatsAppFormat,
  sendTemplateMessage,
  sendBookingConfirmed,
  sendBookingReminder,
  sendReviewRequest,
};
