# CivicConnect
**AI-Powered Crowdsourced Civic Issue Reporting & Resolution System**

CivicConnect is an AI-powered civic issue reporting platform that enables citizens to report public infrastructure issues in under a minute while helping municipal officials efficiently manage and resolve complaints.

The platform leverages **Groq AI** for automatic issue classification, **Cloudinary** for image storage, **Google Maps** for geolocation and visualization, **Firebase Auth** for authentication, and **MongoDB** for complaint management.

---

# Features

## Citizen Portal
- Secure authentication with Firebase Auth
- Report civic issues by uploading images
- AI-powered issue detection using Groq
- Automatic GPS location detection
- AI-generated complaint description
- Automatic department routing
- Complaint status tracking
- Nearby complaints map
- Support nearby complaints to reduce duplicate reports
- View complaint history

---

## Official Portal
- Secure official login
- Dashboard with complaint analytics
- View registered complaints
- Interactive map of complaints
- Update complaint status
- Filter complaints by department, severity, and status

---

# Tech Stack

| Category | Technology |
|-----------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Authentication | Firebase Auth |
| Database | MongoDB |
| AI | Groq API |
| Maps | Google Maps JavaScript API |
| Image Storage | Cloudinary |
| Icons | Lucide React |
| Font | Poppins |

---

# Database Schema

## Users

```js
{
  _id,
  firebase_uid,
  email,
  role,
  department,
  createdAt
}
