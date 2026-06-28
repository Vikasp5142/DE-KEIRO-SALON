# Da Keiro Studiio — Booking API

Express + Mongoose REST API powering the Da Keiro Studiio booking form.

---

## Why bookings weren't reaching you (read this first)

Two separate problems, both fixed in this version:

1. **The backend was never actually deployed.** `Dakeiro.html` pointed
   `API_BASE` at `https://dakeiro-api.onrender.com` — a placeholder URL from
   when this project was scaffolded, but no service was ever created there.
   Every booking submission was silently failing against a server that
   doesn't exist. `API_BASE` now reads `PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE`
   on purpose, and the form will refuse to submit with a clear on-screen
   message until you replace it with your real URL (step 8 below).
2. **`server.js` never loaded `.env`.** Locally, `process.env.MONGODB_URI`
   and `process.env.ADMIN_KEY` were always `undefined` because nothing
   called `require('dotenv').config()`. The server now loads `.env`
   automatically and refuses to start (with a clear error) if
   `MONGODB_URI` is missing, instead of silently limping along.

Once you deploy this folder and paste the live URL into `Dakeiro.html`,
bookings will land in your MongoDB Atlas database and show up at
`GET /api/bookings`.

---

## Folder structure

```
backend/
├── server.js                     ← Entry point
├── package.json
├── .env.example                  ← Copy to .env for local dev
├── models/
│   └── Booking.js                ← Mongoose schema
├── routes/
│   └── bookingRoutes.js          ← Route definitions
├── controllers/
│   └── bookingController.js      ← Business logic
└── middleware/
    └── requireAdminKey.js        ← Admin auth (x-admin-key header)
```

---

## API reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | Public | Health check — confirms the API is alive |
| POST | `/api/bookings` | Public | Submit a booking from the website |
| GET | `/api/bookings/by-phone` | Public | Customer looks up their own bookings by phone number |
| GET | `/api/bookings/stats` | Admin | Counts by status + today's bookings |
| GET | `/api/bookings` | Admin | List bookings (filter/paginate) |
| GET | `/api/bookings/:id` | Admin | Get one booking |
| PATCH | `/api/bookings/:id` | Admin | Update status or adminNote |
| DELETE | `/api/bookings/:id` | Admin | Delete a booking |
| GET | `/api/staff` | Public | List active stylists (Team section + booking form dropdown) |
| GET | `/api/staff/all` | Admin | List every stylist, active or not |
| POST | `/api/staff` | Admin | Add a stylist |
| PATCH | `/api/staff/:id` | Admin | Update or (de)activate a stylist |
| DELETE | `/api/staff/:id` | Admin | Delete a stylist |
| GET | `/api/gallery` | Public | Primary active photo per category (the 4 mood cards) |
| GET | `/api/gallery/all` | Admin | List every gallery photo, active or not |
| POST | `/api/gallery` | Admin | Add a gallery photo |
| PATCH | `/api/gallery/:id` | Admin | Update or (de)activate a gallery photo |
| DELETE | `/api/gallery/:id` | Admin | Delete a gallery photo |

**Admin auth:** pass `x-admin-key: <your ADMIN_KEY>` as a request header.

### Query params for GET /api/bookings
- `status` — `pending` | `confirmed` | `cancelled` | `completed`
- `from` — ISO date string (start of range)
- `to` — ISO date string (end of range)
- `page` — page number (default: 1)
- `limit` — results per page (default: 30, max: 100)

---

## Deploy to Render (free tier)

1. Push this `backend/` folder to a GitHub repo.
2. Go to [render.com](https://render.com) → New → Web Service.
3. Connect the repo. Render auto-detects Node.js.
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node server.js`
6. Add environment variables (Environment tab):
   - `MONGODB_URI` — your Atlas connection string
   - `ADMIN_KEY` — a long random secret (32+ hex chars)
   - `NODE_ENV` — `production`
7. Deploy. Once it says "Live", open `https://your-service.onrender.com/`
   in a browser — you should see `{"success":true,"message":"Da Keiro
   Studiio API is running."}`. If you see that, the backend is genuinely up.
8. Copy that exact URL (no trailing slash) into `Dakeiro.html` →
   `const API_BASE = '...'` near the top of the final `<script>` block,
   replacing the placeholder text.

## Deploy to Railway

1. Push to GitHub. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Add a MongoDB plugin **or** set `MONGODB_URI` to your Atlas string.
3. Add `ADMIN_KEY` and `NODE_ENV=production` in Variables.
4. Railway auto-deploys on push. Copy the generated domain into `API_BASE`.

## Local development

```bash
cd backend
cp .env.example .env          # fill in MONGODB_URI + ADMIN_KEY
npm install
node server.js                # → ✓ MongoDB connected / ✓ Server running on port 5000
```

Test the public POST endpoint:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "phone": "9876543210",
    "service": "Hair Spa",
    "preferredDate": "2026-07-15",
    "preferredTime": "14:30"
  }'
```

Test an admin-only endpoint:
```bash
curl http://localhost:5000/api/bookings/stats \
  -H "x-admin-key: your_secret_here"
```

---

## MongoDB Atlas quick setup

1. [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster (M0).
2. Database Access → Add a user with password.
3. Network Access → Add `0.0.0.0/0` (allow all IPs, required for Render/Railway).
4. Connect → Drivers → Node.js → copy the connection string.
5. Replace `<password>` in the string and paste into `MONGODB_URI`.

---

## Security notes

- The `ADMIN_KEY` check uses `crypto.timingSafeEqual` to prevent timing attacks.
- In production, `ADMIN_KEY` **must** be set — the server will block all admin requests if it isn't.
- Consider upgrading to JWT auth (jsonwebtoken) if you later need per-staff accounts.
- CORS is currently open (`*`). Now that the site has a real address, this is worth tightening in `server.js`:
  ```js
  app.use(cors({ origin: 'https://dakeiro.netlify.app' }));
  ```
  (update this again if you later move to a purchased domain)

---

## SEO setup (Phase 2)

`Dakeiro.html` now includes:
- A `LocalBusiness`/`HairSalon` structured data block (JSON-LD) — lets Google show a rich result with your hours, phone, and map pin instead of a plain link
- Open Graph + Twitter Card tags — controls how the page looks when shared on WhatsApp/Facebook/X
- A canonical URL tag
- `sitemap.xml` and `robots.txt` in this same folder

The site is currently live at **https://dakeiro.netlify.app/** — all of the above already point at this real address, not a placeholder.

**Still outstanding:**
1. **An og-image** — link previews on WhatsApp/social media currently show no image, since none has been uploaded yet. Once you have a good photo (1200×630px works well — your storefront or a hero shot), upload it to the Netlify site and add an `<meta property="og:image">` tag plus an `"image"` field back into the JSON-LD block, both pointing at it.
2. **A real purchased domain**, if you decide to get one later (e.g. `dakeirostudiio.com`) instead of the free `dakeiro.netlify.app` address. If you do, update all four references — `Dakeiro.html`'s `<head>` (canonical + og:url + JSON-LD url), `sitemap.xml`, and `robots.txt` — to the new domain, and point its DNS at Netlify (Netlify's domain settings will give you the exact records to add).

**Deploy `sitemap.xml` and `robots.txt`** at the root of your Netlify site — drag them into the same deploy alongside `index.html` (formerly `Dakeiro.html`), so they're reachable at `dakeiro.netlify.app/sitemap.xml` and `dakeiro.netlify.app/robots.txt` exactly.

### Setting up Google Business Profile (free, do this on Google's side)

This is the single highest-impact thing for local search — more important than anything in the code above.

1. Go to [business.google.com](https://business.google.com) and create a profile for "Da Keiro Studiio"
2. Enter the exact same name, address, and phone number as on the website — Google calls this "NAP consistency," and mismatches between your site and your Google listing actively hurt your ranking
3. Choose category **"Hair salon"** as primary (matches the `HairSalon` schema type used in the code)
4. Verify ownership — Google will mail a postcard with a code to your address, or offer phone/video verification depending on your account
5. Once verified, add: photos, your real hours, services, and a link to your website
6. Encourage customers to leave reviews **directly on your Google listing** — do not try to recreate star ratings in your own site's code; Google's guidelines explicitly treat self-reported ratings on your own structured data as a violation. Real reviews belong on Google's side, where they're verified.

After Google indexes your site (can take anywhere from a few days to a few weeks), you can check your structured data is being read correctly using Google's free [Rich Results Test](https://search.google.com/test/rich-results) — paste in your live URL once you have one.

---

## Customer booking lookup (Phase 4)

The "My Bookings" section on the public site lets a returning customer enter their phone number and see their past bookings, with a "Book Again" shortcut that pre-fills the booking form.

**Security tradeoff, stated plainly:** this uses the phone number alone — no OTP, no password, no account signup. Anyone who knows a customer's phone number could look up their booking history this way. For a small salon where this data is just name/service/date/stylist (not payment info, not anything more sensitive), this is a reasonable, deliberate tradeoff in exchange for not needing a paid SMS provider. If you ever store something more sensitive, or want stronger guarantees, this is the piece to revisit first — it would need a real OTP step (via a provider like MSG91 or Twilio Verify) added in front of the existing `GET /api/bookings/by-phone` endpoint.

The phone matching is format-tolerant — "9876543210", "98765 43210", and "+91 98765-43210" are all treated as the same number, matched on the last 10 digits regardless of spacing/dashes either side used when typing.

---

## WhatsApp notifications (Phase 5)

**What's already built and working right now, with zero setup:** every booking confirmation, pre-appointment reminder, and post-visit review request is fully wired up in the code (`services/whatsapp.js`, `services/reminderScheduler.js`). Until you add real credentials below, every one of these is *simulated* — logged clearly to the server console (visible in Render's Logs tab) instead of actually sent, so you can verify the trigger logic is firing at the right moments before spending anything or setting up a real account.

**Where each message fires from:**
- **Booking confirmed** → fires automatically the moment an admin changes a booking's status to "Confirmed" in the dashboard
- **Reminder** → an hourly background check sends one ~3 hours before each confirmed appointment, and never sends twice for the same booking
- **Review request** → fires automatically when an admin marks a booking "Completed"

### Why Meta's Cloud API directly, not a reseller (BSP)

This is built against Meta's own Cloud API, not a paid reseller like Gupshup or AiSensy. At Da Keiro's volume, that's simpler and cheaper — you pay Meta's per-message rate directly, no middleman markup. Every BSP is itself just a wrapper around this same Cloud API, so if you later want a BSP's extra conveniences (shared team inbox, visual chatbot builder), this code doesn't need to change — you'd just route through their API instead, which looks nearly identical.

### What it costs

- **1,000 free service conversations per month** from Meta, regardless of account verification status
- Beyond that: roughly **₹0.13 per authentication message** and **₹0.88 per marketing-category message** in India (rates change periodically — check Meta's current pricing before relying on this number)
- **Without completing Meta Business Verification, you're capped at 250 conversations per 24 hours** — fine for a single salon's real volume, but verify anyway since the cap can feel sudden if you ever run a promotion

### Setup steps

1. Go to [business.facebook.com](https://business.facebook.com) and create/verify a Meta Business Account using Da Keiro Studiio's real legal name, address, and tax details — mismatches between this and your actual registration are the single most common cause of delays here
2. Submit Business Verification (tax ID, incorporation doc, a utility bill) — takes 2–10 business days
3. Inside that Business Account, create a WhatsApp Business Account (WABA) — this may be created automatically when you add the WhatsApp product
4. Add a dedicated phone number — **it cannot already be registered to personal WhatsApp or the WhatsApp Business app**, and needs to receive an SMS/call to verify
5. In Business Settings → System Users, create a permanent access token (not the temporary one shown in quick-start guides, which expires in 24 hours)
6. Create and submit these three message templates for approval (Meta typically reviews within a few days):
   - **`booking_confirmed`** — e.g. *"Hi {{1}}, your {{2}} appointment at Da Keiro Studiio on {{3}} at {{4}} is confirmed! Reply if you need to change anything."*
   - **`booking_reminder`** — e.g. *"Hi {{1}}, just a reminder — your {{2}} appointment at Da Keiro Studiio is today at {{3}}. See you soon!"*
   - **`review_request`** — e.g. *"Hi {{1}}, thank you for visiting Da Keiro Studiio! We'd love a quick Google review if you have a moment: {{2}}"*
   - Template names in Meta must match these exactly — the code in `services/whatsapp.js` references them by these literal strings
7. Once approved, copy your **Phone Number ID** (from the API Setup section) and your **permanent access token**, and add them to Render's Environment tab as `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
8. Also add `GOOGLE_REVIEW_URL` — get this link from your Google Business Profile dashboard → "Ask for reviews" (only meaningful once that's set up — see Phase 2 above)
9. Save, let Render redeploy, then change a real test booking's status to "Confirmed" in the admin dashboard and check Render's logs — you should see either a real send confirmation or a clear error from Meta's API (e.g. "template not approved") rather than the "SIMULATED" message from before

### A note on testing safely

Before your templates are approved, or before you're ready for real customers to receive these, you can still verify the whole pipeline using **your own phone number** as a test booking's phone field — Meta's setup flow includes adding test recipient numbers that work even before full business verification completes.
