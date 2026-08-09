# CivicConnect

**AI-Powered Crowdsourced Civic Issue Reporting & Resolution System**

CivicConnect is an AI-powered civic issue reporting platform that
enables citizens to report public infrastructure issues in under a
minute while helping municipal officials efficiently manage and resolve
complaints.

The platform leverages **Groq AI** for automatic issue classification,
**Cloudinary** for image storage, **Google Maps** for geolocation and
visualization, **Firebase Auth** for authentication, and **MongoDB** for
complaint management.

------------------------------------------------------------------------

# Features

## Citizen Portal

-   Secure authentication with Firebase Auth
-   Report civic issues by uploading images
-   AI-powered issue detection using Groq
-   Automatic GPS location detection
-   AI-generated complaint description
-   Automatic department routing
-   Complaint status tracking
-   Nearby complaints map
-   Support nearby complaints to reduce duplicate reports
-   View complaint history

------------------------------------------------------------------------

## Official Portal

-   Secure official login
-   Dashboard with complaint analytics
-   View registered complaints
-   Interactive map of complaints
-   Update complaint status
-   Filter complaints by department, severity, and status

------------------------------------------------------------------------

# Tech Stack

  Category         Technology
  ---------------- ----------------------------
  Frontend         React + Vite
  Styling          Tailwind CSS
  Backend          Node.js + Express
  Authentication   Firebase Auth
  Database         MongoDB
  AI               Groq API
  Maps             Google Maps JavaScript API
  Image Storage    Cloudinary
  Icons            Lucide React
  Font             Poppins

------------------------------------------------------------------------

# Database Schema

## Users

``` js
{
  _id,
  firebase_uid,
  email,
  role,
  department,
  createdAt
}
```

------------------------------------------------------------------------

## Officials

``` js
{
  _id,
  email,
  department
}
```

------------------------------------------------------------------------

## Complaints

``` js
{
  _id,
  title,
  description,
  category,
  department,
  severity,
  imageUrl,
  latitude,
  longitude,
  status,
  supporters: [],
  supporterCount,
  createdBy,
  createdAt,
  updatedAt
}
```

------------------------------------------------------------------------

# 🔄 Application Workflow

``` text
Landing Page
      │
      ▼
Login (Firebase Auth)
      │
      ▼
Role Detection
      │
 ┌────┴───────────┐
 │                │
 ▼                ▼
Citizen       Official
 │                │
 ▼                ▼
Upload Image   View Complaints
 │                │
 ▼                ▼
Cloudinary     Update Status
 │                │
 ▼                │
Groq AI          MongoDB
 │
 ▼
AI Auto-fill
 │
 ▼
Submit Complaint
 │
 ▼
MongoDB
 │
 ▼
Track Status
```

------------------------------------------------------------------------

# Citizen Portal

## Sidebar

-   Dashboard
-   Report Issue
-   My Complaints
-   Nearby Map

------------------------------------------------------------------------

## Dashboard

Provides an overview of citizen activity and nearby issues.

**Features** - Complaint statistics - Nearby active complaints - Recent
complaints - Community Support -- Citizens can support nearby complaints
to help prioritize issues and reduce duplicate reports.

------------------------------------------------------------------------

## Report Issue

Report a civic issue with AI assistance.

**Features** - Upload image - Detect location - AI-generated complaint
details - Submit complaint

------------------------------------------------------------------------

## My Complaints

View and track submitted complaints.

**Features** - Complaint history - Status tracking - View complaint
details

------------------------------------------------------------------------

## Nearby Map

View nearby complaints on an interactive map.

**Features** - Complaint markers - View complaint details - Support
existing complaints

------------------------------------------------------------------------

# Official Portal

## Sidebar

-   Dashboard
-   Map View

------------------------------------------------------------------------

## Dashboard

Monitor and manage registered complaints.

**Features** - Complaint statistics - Complaint list - View complaint
details - Update complaint status

**Statuses** - Pending - Assigned - In Progress - Resolved

------------------------------------------------------------------------

## Map View

View and manage complaints on an interactive map.

**Features** - Complaint markers - Filter complaints - View complaint
details - Update complaint status

------------------------------------------------------------------------

# APIs Used

-   Firebase Auth
-   Groq API
-   Google Maps JavaScript API
-   Browser Geolocation API
-   Cloudinary API

------------------------------------------------------------------------

# 🚀 Deployment

  Layer      Platform
  ---------- ------------------------------
  Frontend   [Vercel](https://vercel.com)
  Backend    [Render](https://render.com)
