# CiviSync 🏙️

**AI-Powered Crowdsourced Civic Issue Reporting & Resolution System**

Built for Smart India Hackathon — a complete end-to-end MVP prototype.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express |
| Auth | Supabase Auth |
| Database | MongoDB Atlas |
| AI | Google Gemini 1.5 Flash |
| Maps | Google Maps JavaScript API |
| Images | Cloudinary |

---

## Project Structure

```
CiviSync/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── api/         # API wrapper functions
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth context
│   │   ├── layouts/     # Citizen & Official sidebar layouts
│   │   ├── lib/         # Supabase client, utilities
│   │   └── pages/       # All pages
├── server/          # Node.js + Express backend
│   ├── src/
│   │   ├── config/      # DB, Cloudinary, Gemini, Supabase
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, role guard
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # Express routers
│   │   └── scripts/     # Seed scripts
└── package.json     # Root concurrently config
```

---

## Setup

### 1. Clone and install

```bash
# From the project root
npm run install:all
```

### 2. Configure environment variables

**Backend** — copy `server/.env.example` to `server/.env` and fill in all values:
```
MONGODB_URI=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GEMINI_API_KEY=...
PORT=5000
```

**Frontend** — copy `client/.env.example` to `client/.env` and fill in:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Seed demo data (optional but recommended for demo)

```bash
# Seed officials
npm run seed:officials

# Seed sample complaints (15 complaints around Bengaluru)
npm run seed:complaints
```

### 4. Add officials

To make an email an "official", add it to MongoDB's `officials` collection OR add it to the `seedOfficials.js` file before seeding.

You also need to register those emails in Supabase Auth (Dashboard → Authentication → Users → Create user).

### 5. Run

```bash
npm run dev
```

This starts both client (http://localhost:5173) and server (http://localhost:5000) concurrently.

---

## Demo Flow

1. Open http://localhost:5173
2. Sign up as a citizen (any email)
3. Login → redirected to Citizen Dashboard
4. Click **Report Issue** → upload a photo → Gemini AI auto-fills the form
5. Submit the complaint
6. Login as an official (email seeded in officials collection)
7. View complaint in Official Dashboard table
8. Change status → Citizen sees update on refresh

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | ✓ | Resolve role after Supabase sign-in |
| POST | `/api/upload` | ✓ | Upload image to Cloudinary |
| POST | `/api/ai/analyze` | ✓ | Gemini AI analysis of image |
| GET | `/api/stats` | — | Platform-wide complaint counts |
| GET | `/api/stats/mine` | ✓ | Citizen's own complaint counts |
| POST | `/api/complaints` | ✓ | Create complaint |
| GET | `/api/complaints` | Official | List all with filters/search/pagination |
| GET | `/api/complaints/nearby` | ✓ | Complaints near lat/lng |
| GET | `/api/complaints/mine` | ✓ | My complaints |
| GET | `/api/complaints/all-map` | ✓ | All complaints for map display |
| GET | `/api/complaints/:id` | ✓ | Single complaint |
| PATCH | `/api/complaints/:id/status` | Official | Update status |
| POST | `/api/complaints/:id/support` | ✓ | Toggle support |
