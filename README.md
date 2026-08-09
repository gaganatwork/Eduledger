EduLedger — Fee Management App
A mobile app for tuition centers and private teachers to manage student records, track monthly fees, take daily attendance, and get instant alerts for pending payments.

✨ Features
Authentication: Email/password signup, email verification, forgot password, profile setup

Student Management: Add, edit, delete students with search by name or phone

Fee Tracking: Auto-generated monthly records, mark Full / Half / Missing / Absent per student

Daily Attendance: Tap to mark absent, holiday toggle, auto-sync

Dashboard: Collection stats, today’s attendance card, 6‑month trend chart

Notifications: Alerts for missing/partial fees, grouped Today / Earlier

Dark Mode: Full theme toggle, persists across restarts

Offline First: Works without internet, syncs to Firebase Firestore when online

Cloud Backup: Per-user Firestore sync, auto-restores on reinstall

🛠 Tech Stack
Layer	Technology
Mobile Framework	React Native (Expo SDK 57)
Navigation	Expo Router (file-based)
Local Database	expo-sqlite
Cloud Backup	Firebase Firestore
Authentication	Firebase Auth
Backend	Node.js + Express + MongoDB
Build	Gradle (assembleRelease)


📂 Project Structure
Code
EduLedger/
├── backend/ → Node.js + Express + MongoDB API
│   ├── controllers/ → auth, student, fee, dashboard, notification
│   ├── models/ → User, Student, FeeRecord, Notification
│   ├── routes/ → /api/auth, /api/students, /api/fees
│   ├── middleware/auth.js → JWT protect middleware
│   └── server.js
└── mobile/ → React Native (Expo) app
    ├── app/ → Dashboard, Students, Fees, Alerts, Attendance, Settings
    ├── database/db.js → SQLite schema + CRUD
    ├── services/firebase.js → Firestore sync + offline queue
    ├── context/ → AuthContext, ThemeContext, MonthContext
    └── assets/ → App icon, splash screen
🚀 Getting Started
Backend
bash
cd backend
npm install
cp .env.example .env   # Fill in MONGO_URI and JWT_SECRET
npm run dev
Mobile (Build APK)
bash
cd mobile
npm install --legacy-peer-deps
cd android
./gradlew assembleRelease
APK output: android/app/build/outputs/apk/release/app-release.apk

Environment Variables
Create backend/.env from backend/.env.example:

Code
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
Add your own Firebase config file at:

Code
mobile/android/app/google-services.json
📱 App Info
App Name: EduLedger

Package: com.tuitionpro.app

Version: 1.0.0

Platform: Android (Min SDK 24, Target SDK 36)

Fee Month Range: July 2026 – July 2027

Attendance Range: August 2026 – August 2027

📜 License
MIT License — feel free to use, modify, and share with attribution.
