# EduLedger — Tuition Fee Management App

> A mobile app for tuition centers and private teachers to manage student records, track monthly fees, take daily attendance, and get instant alerts for pending payments.

**Developed by Gaganjot Singh** — exegaganjot@gmail.com

---

## Features

- **Authentication** — Email/password signup, email verification, forgot password, profile setup
- **Student Management** — Add, edit, delete students with search by name or phone
- **Fee Tracking** — Monthly auto-generated records, mark Full / Half / Missing / Absent per student
- **Daily Attendance** — Tap to mark absent, holiday toggle, saves and syncs automatically
- **Dashboard** — Collection stats, today's attendance card, 6-month trend chart
- **Notifications** — Auto alerts for missing/partial fees, grouped Today / Earlier sections
- **Dark Mode** — Full dark theme toggle, persists across app restarts
- **Settings** — Edit profile, change password, delete account
- **Offline First** — Works without internet, syncs to Firebase Firestore when online
- **Cloud Backup** — Per-user Firestore sync, auto-restores on reinstall

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
EduLedger/
├── backend/                        → Node.js + Express + MongoDB API
│   ├── controllers/                → auth, student, fee, dashboard, notification
│   ├── models/                     → User, Student, FeeRecord, Notification
│   ├── routes/                     → /api/auth, /api/students, /api/fees, etc.
│   ├── middleware/auth.js          → JWT protect middleware
│   ├── utils/notificationScheduler.js
│   ├── seed.js
│   └── server.js
└── mobile/                         → React Native (Expo) app
    ├── app/
    │   ├── (tabs)/                 → Dashboard, Students, Fees, Alerts, Attendance, Settings
    │   ├── student/                → Add, View, Edit student screens
    │   ├── login.js
    │   ├── verify-email.js
    │   └── setup-profile.js
    ├── database/db.js              → SQLite schema + all CRUD operations
    ├── services/firebase.js        → Firestore sync + offline queue
    ├── context/                    → AuthContext, ThemeContext, MonthContext
    ├── components/                 → FloatingCard, StatusBadge, MonthPicker, etc.
    ├── constants/colors.js         → Light + Dark theme palettes
    └── assets/                     → App icon, splash screen
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET in .env
npm run dev
```

### Mobile — Build APK

```bash
cd mobile
npm install --legacy-peer-deps
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

> `google-services.json` is not included. Add your own Firebase config file at `mobile/android/app/google-services.json`

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
| Fee Month Range | July 2026 – July 2027 |
| Attendance Range | August 2026 – August 2027 |

---

*Built with React Native + Expo · Firebase Firestore · SQLite · NetInfo*
