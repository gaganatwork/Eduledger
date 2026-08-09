# EduLedger — Tuition Fee Management App

**Designed & Developed by Gaganjot Singh**
**Contact: exegaganjot@gmail.com**

---

## What is EduLedger?

EduLedger is a mobile application built for tuition centers and private teachers to manage student records, track monthly fee payments, take daily attendance, and get instant alerts for pending or missing fees. It works fully offline for daily use and automatically syncs all data to Firebase Firestore whenever internet is available — including queued changes made while offline.

Each user account is completely isolated — every teacher's data is stored privately under their own Firebase account. Multiple users can install and use the same APK independently with no data overlap.

---

## Key Features

### Authentication
- Sign up with email and password
- Email verification required before accessing the app
- One-time profile setup (name + institute name) after first login
- Forgot password via email reset link
- Session persists across app restarts
- **No flash to setup-profile page** — `profileReady` state ensures navigation only happens after Firestore profile check is fully complete
- Logout clears all local SQLite data and signs out of Firebase

### Student Management
- Add, edit, and delete student records
- Each student stores: name, class, phone, email, parent name, monthly fee
- Search students by name or phone number
- Student cards show colored left-border accent and cycling color avatar
- Student count badge shown in header
- View complete fee history + monthly attendance % per student

### Fee Tracking
- Monthly fee entries auto-generated for all active students
- Month range locked to **July 2026 – July 2027**
- Admin marks each student as:
  - ✅ Full Paid — full monthly fee counted
  - 🔶 Half Paid — half fee counted
  - ❌ Not Paid (Missing) — fee outstanding
  - 🚫 Absent — excluded from totals and collection rate entirely
- Reverting from Absent restores the student's full fee amount automatically
- Filter fee list by status — horizontal scrollable filter tabs
- Summary count strip per status
- Total collected vs total due shown as a pill in the header

### Dashboard
- Spring + fade animation on load
- Today's attendance summary card — present / absent / not taken counts, tappable to Attendance tab
- Total fees collected with progress bar and collection rate circle
- Rate circle color-coded: green ≥80%, yellow ≥50%, red below 50%
- Pending amount shown alongside collection rate
- Fee status breakdown (full / half / missing / absent)
- List of students with pending fees — tappable to student profile
- 6-month collection trend chart — bars color-coded by performance
- Shared month state with Fees tab — changing month on either updates both

### Daily Attendance
- 5th tab — calendar icon
- Date navigator locked to **August 2026 – August 2027**
- All active students pre-loaded as Present
- Tap any student row to toggle Absent ↔ Present (bounce animation)
- **Mark as Holiday** toggle — marks all students as Holiday, dims list, fully reversible
- Live present / absent count shown in header
- "Today" shortcut button when navigating away from today's date
- Floating **Save Attendance** button — turns green with ✓ on save
- Fully reversible — reopen any date to edit and re-save
- Syncs to Firestore in background, offline-queued if no internet

### Notifications / Alerts
- Auto-generated alerts for missing, partial, or absent fee status
- Alerts cleared automatically when fee is fully paid
- Grouped into **Today** and **Earlier** sections with styled dividers
- Each section divider shows unread count for that group
- Mark individual or all alerts as read
- Delete individual alerts
- Unread banner with count badge

### Settings
- **Edit Profile** — tap pencil on profile card to edit name and institute inline
- **Dark Mode** toggle — persists across app restarts via AsyncStorage
- **Change Password** — bottom-sheet modal, re-authenticates before updating
- **Delete Account** — double confirmation, deletes all Firestore data + SQLite + Firebase Auth user
- App version, developer info, contact email (tappable to open mail app)
- Logout with confirmation

### Dark Mode
- Full dark theme across all 6 tabs and all screens
- `ThemeContext` provides `useTheme()` hook — every screen reads colors dynamically
- Light and dark palettes defined in `constants/colors.js`
- Theme preference saved to AsyncStorage — survives app restarts

### Offline Sync Queue
- All changes made while offline saved to local `sync_queue` SQLite table
- Queue flushed automatically when internet returns (NetInfo listener)
- Queue also flushed on app foreground (AppState listener)
- No data ever lost due to being offline

### Cloud Backup (Firebase Firestore)
- All data syncs per-user to Firestore in the background
- Works fully offline for daily use via SQLite
- After reinstall — data restored automatically from cloud on first login
- Free Firebase Spark plan — no credit card, no expiry
- Multi-user safe — each user's data under their own UID

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native (Expo SDK 57) |
| Navigation | Expo Router (file-based) |
| Local Database | expo-sqlite (SQLite on device) |
| Cloud Backup | Firebase Firestore (@react-native-firebase) |
| Authentication | Firebase Auth (@react-native-firebase/auth) |
| Network Detection | @react-native-community/netinfo |
| Theme | Custom ThemeContext — light + dark palettes |
| UI | Floating cards, colored avatars, animated headers, dark mode |
| Build | Local Gradle (assembleRelease) |

---

## How It Works (Offline + Cloud)

```
Daily use (online):
  Action → SQLite (instant) → Firestore sync in background

Daily use (offline):
  Action → SQLite (instant) → enqueue to sync_queue table

When internet returns:
  NetInfo detects connection → flush sync_queue → Firestore updated

When app comes to foreground:
  AppState listener → flush sync_queue → Firestore updated

After reinstall / new device:
  Login → check Firestore → restore all data → ready to use

Account switch:
  Different user logs in → local SQLite cleared → their cloud data restored
```

---

## Data Isolation (Multi-User)

```
Firestore structure:
users/
  └── {uid}/
        ├── students/
        ├── fee_records/
        ├── notifications/
        └── attendance/
```

Every user gets their own private Firestore namespace. No user can see another user's data.

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
| Developer | Gaganjot Singh |
| Contact | exegaganjot@gmail.com |

---

## Project Structure

```
mobile/
├── app/
│   ├── _layout.js             → Root layout: ThemeProvider, DB init, cloud restore, sync flush
│   ├── index.js               → Auth redirect (login / verify-email / setup-profile / dashboard)
│   ├── login.js               → Sign-in + Sign-up tabs, forgot password modal, contact email
│   ├── verify-email.js        → Email verification: pulse animation + resend countdown
│   ├── setup-profile.js       → One-time profile setup (name + institute)
│   ├── (tabs)/
│   │   ├── _layout.js         → 6-tab bottom nav (size 20 icons, 9px labels, theme-aware)
│   │   ├── dashboard.js       → Hero card, today attendance card, stat grid, trend chart
│   │   ├── students.js        → Colored cards, search, count badge, CRUD
│   │   ├── fees.js            → Collected/due pill, filter tabs, expandable status picker
│   │   ├── notifications.js   → Today/Earlier groups, unread banner, mark/delete
│   │   ├── attendance.js      → Date nav, holiday toggle, tap-to-toggle, save button
│   │   └── settings.js        → Edit profile, dark mode, change password, delete account
│   └── student/
│       ├── add.js             → Add student (keyboard flow between all fields)
│       ├── [id].js            → Profile card, contact info, stats, fee history, attendance %
│       └── edit/[id].js       → Edit student (pre-filled, keyboard flow, fee validation)
├── database/
│   ├── db.js                  → SQLite schema (5 tables) + all CRUD + dashboard + attendance
│   └── syncQueue.js           → Offline queue helpers (enqueue / dequeue / getPending)
├── services/
│   └── firebase.js            → Firestore sync for all entities, queue flush, restore, clear
├── context/
│   ├── AuthContext.js         → Firebase Auth: signup, signin, profile, logout, delete
│   ├── MonthContext.js        → Shared month state across Dashboard and Fees tabs
│   └── ThemeContext.js        → isDark state, AsyncStorage persist, useTheme() hook
├── components/
│   ├── FloatingCard.js        → Theme-aware floating card (3 shadow levels)
│   ├── StatusBadge.js         → Fee status badge (full / half / missing / absent)
│   ├── MonthPicker.js         → Theme-aware month picker clamped to Jul 2026–Jul 2027
│   ├── LoadingScreen.js       → Animated splash: logo entrance + centered ripple rings
│   └── EmptyState.js          → Theme-aware empty list placeholder
├── constants/
│   ├── colors.js              → Light palette (Colors) + Dark palette (DarkColors)
│   └── api.js                 → Backend API base URL config
├── assets/
│   ├── icon.png               → App icon (1024×1024px)
│   ├── adaptive-icon.png      → Android adaptive icon foreground (1024×1024px, transparent bg)
│   └── splash.png             → Splash screen image
├── android/
│   └── app/src/main/res/      → Mipmap folders with HD icons (no resize — full quality)
│       ├── mipmap-mdpi/       → ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png
│       ├── mipmap-hdpi/
│       ├── mipmap-xhdpi/
│       ├── mipmap-xxhdpi/
│       ├── mipmap-xxxhdpi/
│       └── mipmap-anydpi-v26/ → ic_launcher.xml, ic_launcher_round.xml (adaptive icon XML)
├── google-services.json       → Firebase Android configuration
├── app.json                   → Expo app configuration
├── eas.json                   → EAS build configuration
└── package.json               → Dependencies
```

---

## Performance Optimizations

### Database (SQLite)
- `generateMonthlyFees` — single bulk `INSERT...SELECT` instead of N individual inserts (~10x faster)
- `getDashboardData` trend chart — one `GROUP BY` query instead of 6 separate monthly queries (~6x faster)
- `getStudentAttendanceSummary` — one `GROUP BY` query instead of 6 separate monthly queries (~6x faster)
- `saveAttendance` — wrapped in a single SQLite transaction instead of N individual insert+select calls (~5x faster)
- SQL indexes added on hot columns: `fee_records(month)`, `fee_records(student_id)`, `notifications(is_read)`, `notifications(student_id)`, `attendance(date)`, `attendance(student_id)`

### React / UI
- `StudentCard` (students screen) — wrapped in `React.memo` — no unnecessary re-renders
- `StudentRow` (attendance screen) — wrapped in `React.memo` — no re-renders on unrelated state changes
- `TodayAttendanceCard` (dashboard) — wrapped in `React.memo` + `useRef` guard — fetches only once per mount
- Fee counts and totals — computed with `useMemo` — no recalculation on every render
- All FlatLists — `removeClippedSubviews`, `maxToRenderPerBatch=10`, `windowSize=10`, `initialNumToRender=12`

### Splash / Startup
- Native Android splash (`splashscreen_logo.png`) replaced with custom HD image in all drawable density folders
- Splash background color updated to `#030B1A` matching the custom splash image
- `profileReady` state in `AuthContext` prevents premature navigation — no setup-profile flash on login
- Tab bar uses `useSafeAreaInsets` — dynamically adjusts height for gesture navigation bar on Android and home indicator on iOS — no overlap on any device

| Table | Purpose |
|-------|---------|
| `students` | Student records |
| `fee_records` | Monthly fee entries per student |
| `notifications` | Fee alerts |
| `attendance` | Daily attendance per student (present / absent / holiday) |
| `sync_queue` | Offline operations waiting to sync to Firestore |

---

## Backend (Node.js / Express)

A separate Express + MongoDB backend is included but not used by the mobile app (the app uses Firebase directly). It can serve as an alternative API layer if needed.

```
backend/
├── server.js                       → Express app, MongoDB connect, cron scheduler
├── models/                         → User, Student, FeeRecord, Notification (Mongoose)
├── controllers/                    → auth, student, fee, dashboard, notification
├── routes/                         → /api/auth, /api/students, /api/fees, /api/dashboard, /api/notifications
├── middleware/auth.js               → JWT protect middleware
├── utils/notificationScheduler.js  → Daily 9AM cron job for notification generation
└── seed.js                         → Seeds admin + 8 sample students with fee records
```

---

## Building the APK

```powershell
# Step 1 — Install dependencies (first time only)
cd C:\Users\bimal\Desktop\new_app\mobile
npm install --legacy-peer-deps

# Step 2 — Build release APK
cd android
.\gradlew assembleRelease
```

APK output:
```
android\app\build\outputs\apk\release\app-release.apk
```

**Always uninstall old version before installing a new one.**

---

## Replacing App Icon

1. Place new images in `mobile\assets\`:
   - `icon.png` — 1024×1024px
   - `adaptive-icon.png` — 1024×1024px, transparent background
   - `splash.png` — 1284×2778px
2. Run the icon replacement script (PowerShell):
```powershell
# Copy HD image to all mipmap folders — no resize, full quality
$src = "C:\Users\bimal\Desktop\new_app\mobile\assets\adaptive-icon.png"
$res = "C:\Users\bimal\Desktop\new_app\mobile\android\app\src\main\res"
foreach ($f in @("mipmap-mdpi","mipmap-hdpi","mipmap-xhdpi","mipmap-xxhdpi","mipmap-xxxhdpi")) {
  Remove-Item "$res\$f\*" -Force
  Copy-Item $src "$res\$f\ic_launcher.png" -Force
  Copy-Item $src "$res\$f\ic_launcher_round.png" -Force
  Copy-Item $src "$res\$f\ic_launcher_foreground.png" -Force
}
```
3. Clear build cache and rebuild:
```powershell
Remove-Item -Recurse -Force "android\app\build","android\build","android\.gradle",".expo"
cd android
.\gradlew assembleRelease
```

---

## Making Changes

1. Edit source files in the `mobile/` folder
2. Rebuild:
```powershell
cd C:\Users\bimal\Desktop\new_app\mobile\android
.\gradlew assembleRelease
```
3. Uninstall old APK → install new APK

---

## Known Behaviors

- **Absent fee logic** — Marking absent sets `amount_due = 0`. Reverting restores `amount_due` to the student's full monthly fee.
- **Offline sync** — Changes queued and synced automatically when internet returns. Queue persists across restarts.
- **Fee month boundaries** — MonthPicker disabled at July 2026 and July 2027.
- **Attendance date boundaries** — Date navigator disabled at August 2026 and August 2027.
- **Holiday logic** — Marking a day as holiday sets all students to `holiday`. Holiday days are excluded from attendance % calculations.
- **Fresh install** — Firestore data restores automatically on first login if cloud data exists.
- **Account switching** — Different user logs in → local SQLite cleared → their cloud data restored.
- **Email verification** — Unverified sessions are automatically signed out.
- **Delete account** — Requires recent login. If session is too old, user is prompted to re-login first.
- **Dark mode** — Preference saved to AsyncStorage. Loads before first render to avoid flash.
- **App icon** — Full HD image used directly in all mipmap folders. No downscaling to preserve quality.

---

## Contact / Support

For queries or support, contact the developer:
**exegaganjot@gmail.com**

---

*Built with React Native + Expo | Firebase Auth + Firestore | SQLite | NetInfo*
