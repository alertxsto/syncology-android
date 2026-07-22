# Syncology Android

Aplikasi Android native untuk Syncology — platform manajemen tugas tim berbasis akuntabilitas.

Dibangun dengan React Native 0.86, menggunakan backend Supabase yang sama persis dengan versi desktop (Tauri/Rust).

---

## Struktur Project

```
syncology-android/
├── src/
│   ├── api/           — Supabase API layer (menggantikan Rust commands)
│   ├── screens/       — Semua screens dan tabs
│   ├── navigation/    — AppNavigator, MainNavigator, RoomTabNavigator
│   ├── store/         — AuthContext (global auth state)
│   ├── hooks/         — useRealtime (Supabase realtime)
│   ├── theme/         — colors, typography, spacing
│   └── types/         — TypeScript types (identik dengan desktop)
└── android/           — Native Android project
```

---

## Setup Sebelum Build

### 1. Download google-services.json

1. Buka Firebase Console -> Project `syncology`
2. Project Settings -> Your apps -> Tambahkan Android app
3. Package name: `com.syncologyandroid`
4. Register app -> Download `google-services.json`
5. Taruh file di `android/app/google-services.json`

### 2. Aktifkan Google Sign-In di Firebase Console

Authentication -> Sign-in method -> Google -> Enable

### 3. Ambil SHA-1 debug fingerprint

```bash
cd android
./gradlew signingReport
```

Tambahkan SHA-1 tersebut di Firebase Console -> Project Settings -> Android app.

### 4. Ambil Web Client ID

Firebase Console -> Authentication -> Sign-in method -> Google -> Copy "Web client ID"

Paste ke `src/api/auth.ts` variabel `WEB_CLIENT_ID`.

---

## Jalankan Aplikasi

```bash
npm install --legacy-peer-deps

# Start Metro bundler
npm start

# Run di Android
npm run android
```

---

## Fitur

| Fitur | Status |
|---|---|
| Login Google native (bukan browser popup) | Siap |
| Daftar rooms, buat/join room | Siap |
| Overview (stats, progress, leaderboard) | Siap |
| Tasks (filter, detail, approve/reject) | Siap |
| Usulkan tugas baru | Siap |
| Submit evidence | Siap |
| Chat realtime | Siap |
| Ledger (papan skor) | Siap |
| Activity log | Siap |
| Room info dan member management | Siap |
| Member profile dan statistik | Siap |
| Supabase Realtime live updates | Siap |
