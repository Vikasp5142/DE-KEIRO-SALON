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
| GET | `/api/bookings/stats` | Admin | Counts by status + today's bookings |
| GET | `/api/bookings` | Admin | List bookings (filter/paginate) |
| GET | `/api/bookings/:id` | Admin | Get one booking |
| PATCH | `/api/bookings/:id` | Admin | Update status or adminNote |
| DELETE | `/api/bookings/:id` | Admin | Delete a booking |

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
- CORS is currently open (`*`). Before launch, restrict it to your frontend domain in `server.js`:
  ```js
  app.use(cors({ origin: 'https://dakeirostudiio.com' }));
  ```
