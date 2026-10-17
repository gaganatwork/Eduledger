# 📚 EduLedger — Fee Management App

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)
![Platform](https://img.shields.io/badge/platform-Android-lightgrey.svg)

A mobile + backend solution for tuition centers and private teachers to manage student records, track monthly fees, take daily attendance, and get instant alerts for pending payments.

---

## ✨ Features

- 🔑 **Authentication** — Email/password signup, verification, forgot password, profile setup
- 👨‍🎓 **Student Management** — Add, edit, delete students with search by name or phone
- 💰 **Fee Tracking** — Auto-generated monthly records, mark Full / Half / Missing / Absent
- 🧾 **Instant Receipts** — Marking paid instantly generates a receipt and opens the share sheet (WhatsApp, Gmail, etc.)
- 📅 **Daily Attendance** — Tap to mark absent, holiday toggle, auto-sync
- 📊 **Dashboard** — Collection stats, today's attendance card, 6‑month trend chart
- 🔔 **Notifications** — Alerts for missing/partial fees, grouped Today / Earlier
- 🌙 **Dark Mode** — Full theme toggle, persists across restarts
- 📶 **Offline First** — Works without internet, syncs to Firebase Firestore when online
- ☁️ **Cloud Backup** — Per-user Firestore sync, auto-restores on reinstall or re-login

---

## 🛠 Tech Stack

| ⚙️ Layer | 🚀 Technology |
|----------|--------------|
| 📱 Mobile Framework | React Native (Expo SDK 57) |
| 🧭 Navigation | Expo Router |
| 💾 Local Database | SQLite (WAL mode) |
| ☁️ Cloud Backup | Firebase Firestore |
| 🔐 Authentication | Firebase Auth |
| 🖥 Backend | Node.js + Express + MongoDB |
| 🛠 Build | Gradle (assembleRelease) |

---

## 📂 Project Structure
EduLedger/ ├── 📦 backend/ → Node.js + Express + MongoDB API │ ├── 📂 controllers/ → auth, student, fee, dashboard, notification │ ├── 📂 models/ → User, Student, FeeRecord, Notification │ ├── 📂 routes/ → /api/auth, /api/students, /api/fees │ ├── 🛡 middleware/auth.js → JWT protect middleware │ └── ⚙️ server.js └── 📱 mobile/ → React Native (Expo) app ├── 📂 app/ → Dashboard, Students, Fees, Alerts, Attendance, Settings ├── 💾 database/db.js → SQLite schema + CRUD + safe connection ├── ☁️ services/firebase.js → Firestore sync + offline queue ├── 🎛 context/ → AuthContext, SyncContext, ThemeContext, MonthContext ├── 🧩 components/ → StatusBadge, MonthPicker, LoadingScreen, etc. ├── 🔧 utils/ → receiptUtils, timeAgo └── 🖼 assets/ → App icon, splash screen





---

## 🚀 Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET
npm run dev


cd mobile
npm install
cd android
.\gradlew assembleRelease

android/app/build/outputs/apk/release/app-release.apk
