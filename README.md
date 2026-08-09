# EduLedger — Tuition Fee Management App

> A mobile app for tuition centers and private teachers to manage student records, track monthly fees, take daily attendance, and get instant alerts for pending payments.

---

## Screenshots

| Dashboard | Fee Tracking | Attendance | Settings |
|-----------|-------------|------------|----------|
| ![Dashboard](https://via.placeholder.com/150x300/6C63FF/ffffff?text=Dashboard) | ![Fees](https://via.placeholder.com/150x300/6C63FF/ffffff?text=Fees) | ![Attendance](https://via.placeholder.com/150x300/6C63FF/ffffff?text=Attendance) | ![Settings](https://via.placeholder.com/150x300/6C63FF/ffffff?text=Settings) |

---

## Features

- **Authentication** — Email/password signup, email verification, forgot password, profile setup
- **Student Management** — Add, edit, delete students with search by name or phone
- **Fee Tracking** — Monthly auto-generated records, mark Full / Half / Missing / Absent
- **Daily Attendance** — Tap to mark absent, holiday toggle, saves and syncs automatically
- **Dashboard** — Collection stats, today's attendance summary, 6-month trend chart
- **Notifications** — Auto alerts for missing/partial fees, grouped Today/Earlier
- **Dark Mode** — Full dark theme toggle, persists across restarts
- **Settings** — Edit profile, change password, delete account
- **Offline First** — Works without internet, syncs to Firebase when online
- **Cloud Backup** — Firestore sync per user, auto-restore on reinstall

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native (Expo SDK 57) |
| Navigation | Expo Router (file-based) |
| Local Database | expo-sqlite |
| Cloud Backup | Firebase Firestore |
| Authentication | Firebase Auth |
| Network Detection | @react-native-community/netinfo |
| Build | Local Gradle (assembleRelease) |

---

## Project Structure

```
new_app/
├── backend/                  → Node.js + Express + MongoDB API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── server.js
└── mobile/                   → React Native (Expo) app
    ├── app/
    │   ├── (tabs)/           → Dashboard, Students, Fees, Alerts, Attendance, Settings
    │   └── student/          → Add, View, Edit student screens
    ├── database/             → SQLite schema + CRUD
    ├── services/             → Firebase Firestore sync
    ├── context/              → Auth, Theme, Month contexts
    ├── components/           → Reusable UI components
    └── constants/            → Colors (light + dark)
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET in .env
npm run dev
```

### Mobile (Build APK)

```bash
cd mobile
npm install --legacy-peer-deps

# Build release APK
cd android
.\gradlew assembleRelease
```

APK output:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

> **Note:** `google-services.json` (Firebase config) is not included in this repo. Add your own from the Firebase Console.

---

## App Info

| Property | Value |
|----------|-------|
| App Name | EduLedger |
| Package | com.tuitionpro.app |
| Version | 1.0.0 |
| Platform | Android |
| Min SDK | 24 (Android 7.0+) |
| Target SDK | 36 |

---

## Developer

**Gaganjot Singh**
📧 exegaganjot@gmail.com

---

*Built with React Native + Expo · Firebase Firestore · SQLite · NetInfo*
