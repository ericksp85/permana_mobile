# Permana Sales — Mobile (React Native + Expo)

Native field app for Account Managers / Sales Managers, consuming the Laravel
API (`/api/v1`) that also powers the Permana Sales web console and PWA.

- **Framework:** Expo (SDK 58) + React Native + TypeScript
- **Auth:** Sanctum personal access token, stored in `expo-secure-store`
- **Navigation:** React Navigation (bottom tabs)
- **Backend:** the `sales` Laravel app — set the URL in [`src/config.ts`](src/config.ts)

## Menjalankan (dev)

Default-nya app terhubung ke backend console live (`https://sales.permana.net.id`), jadi memakai user dan data yang sama dengan web console.

```bash
npm install
npx expo start --ios      # atau --android
```

> **Alamat API:** default `https://sales.permana.net.id/api/v1` (lihat `src/config.ts`).
> Untuk dev lokal (Herd), buat `.env.local` berisi `EXPO_PUBLIC_API_BASE_URL=http://sales.test/api/v1`
> (Android emulator: `http://10.0.2.2/api/v1`).
> Simulator iOS ikut DNS Mac, jadi `sales.test` biasanya kebaca. Kalau di HP
> fisik / tidak kebaca, ganti ke IP LAN Mac (mis. `http://192.168.1.20/api/v1`).
> HTTP non-TLS diizinkan untuk dev via ATS (`app.json`).

Akun demo (password `password`): `rizky.pratama@permana.net.id` (Account
Manager), `hendra.gunawan@permana.net.id` (Sales Manager).

## Struktur

```
src/
  config.ts              # URL API + nama perangkat token (lewat EXPO_PUBLIC_*)
  fonts.ts               # pemetaan global fontWeight → Plus Jakarta Sans
  theme.ts               # token warna Permana (mirror dari web)
  types/api.ts           # bentuk respons API
  api/client.ts          # apiFetch + ApiError + bearer token
  auth/AuthContext.tsx   # login/logout, simpan token, hidrasi /me
  offline/               # antrean outbox, konteks konektivitas, SyncBanner
  components/ui.tsx       # Button, Card, Field, Pill, StagePill, ProgressRing
  navigation/            # RootNavigator (auth gate) + Tab + Home/Pipeline/More stack
  screens/               # Login, Home, Pipeline, LeadDetail, Schedule, More, dst.
```

## Mode offline

Mutasi lapangan (check-in/out absensi, kunjungan canvassing, log aktivitas lead)
memakai **outbox** yang tahan restart (`src/offline/`):

- `submitOrQueue()` mencoba kirim; kalau perangkat offline atau jaringan putus,
  item masuk antrean AsyncStorage dan tetap diproses nanti.
- `OfflineContext` memantau konektivitas (NetInfo) + status foreground app, lalu
  mem-*flush* antrean otomatis saat online kembali. Error server (`ApiError`)
  tidak di-antre ulang — hanya kegagalan koneksi.
- `SyncBanner` muncul di Home, Absensi, Canvassing, dan Detail lead saat offline
  atau masih ada item menunggu sinkron. Baris optimistik berlabel "Pending sync".

## Build rilis (EAS)

Profil build ada di [`eas.json`](eas.json): `development` (simulator + dev
client), `preview` (internal / APK), `production` (store).
URL API tiap profil diset lewat `EXPO_PUBLIC_API_BASE_URL` — sesuaikan host
staging/produksi sebelum build.

```bash
npm install --global eas-cli      # sekali saja
eas login                         # akun Expo milik tim
eas init                          # tautkan projectId (menulis extra.eas.projectId)
eas build --profile preview --platform android   # APK internal
eas build --profile production --platform all    # iOS + Android untuk store
eas submit --profile production --platform ios    # unggah ke App Store Connect
```

> Build EAS berjalan di cloud Expo dan butuh login akun Expo + kredensial
> store, jadi tidak dapat dijalankan dari lingkungan ini — langkah di atas
> dijalankan oleh tim. `eas init` akan menambahkan `extra.eas.projectId` ke
> `app.json`.

## Peta jalan (milestone)

- **M0 ✅** Login + sesi token, navigasi tab, Pipeline (daftar lead) dari API.
- **M1 ✅** Detail lead + aktivitas, Jadwal.
- **M2 ✅** Absensi (selfie + GPS + geofence).
- **M3 ✅** Canvassing + foto.
- **M4 ✅** Quotation, target, laporan, notifikasi.
- **M5 ✅** Antrean offline + persiapan build rilis (profil EAS).

## Test

```bash
npm test          # jest-expo: apiFetch + antrean offline/sync
npx tsc --noEmit && npx expo lint
```

## Konfigurasi build & OTA update

- `app.config.ts` melapisi `app.json`: izin HTTP polos (ATS iOS / cleartext Android)
  **hanya** aktif untuk build lokal dan profil `development`; `preview` dan
  `production` bersih (HTTPS saja).
- `expo-updates` terpasang dengan `runtimeVersion` policy `appVersion`. Agar OTA
  aktif, hubungkan proyek ke EAS sekali: `npx eas-cli@latest init` lalu
  `npx eas-cli@latest update:configure`. Kirim update: `eas update --channel production`.
- Error tak terduga dilaporkan lewat `src/monitoring.ts` (saat ini hanya log) dan
  ditangkap `ErrorBoundary`. Untuk crash reporting, sambungkan Sentry di `reportError`.
