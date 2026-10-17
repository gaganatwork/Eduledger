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

