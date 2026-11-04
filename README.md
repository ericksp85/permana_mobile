# Permana Sales — Mobile (React Native + Expo)

Native field app for Account Managers / Sales Managers, consuming the Laravel
API (`/api/v1`) that also powers the Permana Sales web console and PWA.

- **Framework:** Expo (SDK 58) + React Native + TypeScript
- **Auth:** Sanctum personal access token, stored in `expo-secure-store`
- **Navigation:** React Navigation (bottom tabs)
- **Backend:** the `sales` Laravel app — set the URL in [`src/config.ts`](src/config.ts)

## Menjalankan (dev)

Pastikan backend hidup lebih dulu (Herd: `http://sales.test`).

```bash
npm install
npx expo start --ios      # atau --android
```

> **Alamat API:** default `http://sales.test/api/v1` (lihat `src/config.ts`).
> Simulator iOS ikut DNS Mac, jadi `sales.test` biasanya kebaca. Kalau di HP
> fisik / tidak kebaca, ganti ke IP LAN Mac (mis. `http://192.168.1.20/api/v1`).
> HTTP non-TLS diizinkan untuk dev via ATS (`app.json`).

Akun demo (password `password`): `rizky.pratama@permana.net.id` (Account
Manager), `hendra.gunawan@permana.net.id` (Sales Manager).

## Struktur

```
src/
  config.ts              # URL API + nama perangkat token
  theme.ts               # token warna Permana (mirror dari web)
  types/api.ts           # bentuk respons API
  api/client.ts          # apiFetch + ApiError + bearer token
  auth/AuthContext.tsx   # login/logout, simpan token, hidrasi /me
  components/ui.tsx       # Button, Card, Field, Pill, StagePill
  navigation/            # RootNavigator (auth gate) + TabNavigator
  screens/               # Login, Home, Pipeline, Placeholder
```

## Peta jalan (milestone)

- **M0 ✅** Login + sesi token, navigasi tab, Pipeline (daftar lead) dari API.
- **M1** Detail lead + aktivitas, Jadwal.
- **M2** Absensi (selfie + GPS + geofence).
- **M3** Canvassing + foto (perlu kolom foto di API `canvass_visits`).
- **M4** Quotation, target, laporan, notifikasi.
- **M5** Antrean offline + build rilis (iOS/Android).
