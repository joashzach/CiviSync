# CiviSync 

**AI-Powered Crowdsourced Civic Issue Reporting & Resolution System**

CiviSync lets citizens report public infrastructure issues in under a minute, while helping municipal officials manage and resolve complaints efficiently. Built for Smart India Hackathon as an end-to-end MVP prototype.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Flow](#demo-flow)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)

## Features

### Citizen Portal

- Secure authentication
- Report civic issues by uploading an image
- AI-powered issue detection using Groq
- Automatic GPS location detection
- AI-generated complaint description
- Automatic department routing
- Complaint status tracking and history
- Nearby complaints map
- Support nearby complaints to help prioritize issues and reduce duplicate reports

### Official Portal

- Secure official login
- Dashboard with complaint analytics
- Interactive map of complaints
- Filter complaints by department, severity, and status
- Update complaint status: `Pending` → `Assigned` → `In Progress` → `Resolved`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express |
| Authentication | Firebase Auth |
| Database | MongoDB Atlas |
| AI | Groq AI (Llama 4 Vision) |
| Maps | Google Maps JavaScript API, Browser Geolocation API |
| Image Storage | Cloudinary |
| Icons | Lucide React |
| Font | Poppins |

## Project Structure

```
CiviSync/
├── client/          # React + Vite frontend
│   └── src/
│       ├── api/         # API wrapper functions
│       ├── components/  # Reusable components
│       ├── context/     # Auth context
│       ├── layouts/     # Citizen & Official sidebar layouts
│       ├── lib/         # Client libraries and utilities
│       └── pages/       # All pages
├── server/          # Node.js + Express backend
│   └── src/
│       ├── config/      # DB, Cloudinary, Groq, Firebase
│       ├── controllers/ # Route handlers
│       ├── middleware/  # Auth, role guard
│       ├── models/      # Mongoose models
│       ├── routes/      # Express routers
│       └── scripts/     # Seed scripts
└── package.json     # Root concurrently config
```

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

### 2. Configure environment variables

**Backend**: copy `server/.env.example` to `server/.env` and fill in all values:

```env
MONGODB_URI=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
PORT=5000
```

**Frontend**: copy `client/.env.example` to `client/.env` and fill in:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_BASE_URL=http://localhost:5000/api
```

<!-- TODO: the env variables above reference Supabase while the stack lists Firebase Auth. Reconcile with the actual code before publishing. -->

### 3. Seed demo data (optional, recommended for demos)

```bash
npm run seed:officials     # seed officials
npm run seed:complaints    # seed 15 sample complaints around Bengaluru
```

### 4. Add officials

To make an email an official, either add it to the `officials` collection in MongoDB, or add it to `seedOfficials.js` before seeding. Each official email must also be registered in the authentication provider (for Supabase: Dashboard → Authentication → Users → Create user).

### 5. Run

```bash
npm run dev
```

This starts both services concurrently:

- Client: http://localhost:5173
- Server: http://localhost:5000

## Demo Flow

1. Open http://localhost:5173
2. Sign up as a citizen (any email)
3. Log in and land on the Citizen Dashboard
4. Click **Report Issue**, upload a photo, and let Groq AI auto-fill the form
5. Submit the complaint
6. Log in as an official (an email seeded in the `officials` collection)
7. View the complaint in the Official Dashboard table
8. Change its status; the citizen sees the update on refresh

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Required | Resolve role after sign-in |
| POST | `/api/upload` | Required | Upload image to Cloudinary |
| POST | `/api/ai/analyze` | Required | Groq AI analysis of image |
| GET | `/api/stats` | None | Platform-wide complaint counts |
| GET | `/api/stats/mine` | Required | Citizen's own complaint counts |
| POST | `/api/complaints` | Required | Create complaint |
| GET | `/api/complaints` | Official | List all with filters, search, pagination |
| GET | `/api/complaints/nearby` | Required | Complaints near a lat/lng |
| GET | `/api/complaints/mine` | Required | My complaints |
| GET | `/api/complaints/all-map` | Required | All complaints for map display |
| GET | `/api/complaints/:id` | Required | Single complaint |
| PATCH | `/api/complaints/:id/status` | Official | Update status |
| POST | `/api/complaints/:id/support` | Required | Toggle support |

## Deployment

| Layer | Platform |
|-------|----------|
| Frontend | [Vercel](https://vercel.com) |
| Backend | [Render](https://render.com) |
