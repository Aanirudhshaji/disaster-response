# 🌍 Disaster Response Coordination Platform

A backend-heavy MERN stack application that helps coordinate real-time disaster response using AI, geospatial data, and public reports.

![Status](https://img.shields.io/badge/build-success-green) ![Stack](https://img.shields.io/badge/stack-MERN-blue)

---

## 🚀 Live Demo

- **Frontend (Vercel):** [Visit Frontend](https://your-frontend-url.vercel.app)
- **Backend (Render):** [API Docs](https://disaster-response-wj1d.onrender.com)

---

## 🎯 Project Overview

This app helps citizens, NGOs, and relief workers:
- Report and view disasters
- Automatically detect disaster locations from descriptions
- Geocode locations using OpenStreetMap
- View official disaster updates (via NDMA)
- Submit images for AI-based verification
- Broadcast real-time updates using WebSockets

---

## 🔧 Tech Stack

| Layer        | Tools Used |
|--------------|------------|
| **Frontend** | React + Vite + Axios |
| **Backend**  | Node.js + Express.js |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **AI**       | Google Gemini Pro (Text + Vision) |
| **Maps**     | OpenStreetMap Nominatim |
| **DevOps**   | GitHub, Vercel, Render |

---

## 🔑 Features

- 🧠 **AI-powered location extraction** using Gemini
- 🌍 **Real-time geocoding** with OpenStreetMap
- 📡 **WebSockets** for disaster/resource updates
- 🖼️ **Image verification** using Gemini Vision API
- 📲 **Mock social media monitoring**
- 🧾 **Audit trail and ownership tracking**
- 🗃️ **Geospatial queries** with Supabase
- 🗂️ **Caching of external APIs** in Supabase

---

## 📦 API Endpoints

### Disasters
- `POST /disasters/auto-create` → Creates with location detection
- `GET /disasters` → List all disasters
- `PUT /disasters/:id` → Update with audit trail
- `DELETE /disasters/:id` → Delete a disaster

### Reports
- `POST /disasters/:id/reports` → Submit a user report

### Image Verification
- `POST /disasters/:id/verify-image` → Gemini AI analyzes image

### Social Media
- `GET /disasters/:id/social-media` → Filtered mock tweets

### Official Updates
- `GET /disasters/:id/official-updates` → Scraped from NDMA with caching

---

## 🗂️ Folder Structure

