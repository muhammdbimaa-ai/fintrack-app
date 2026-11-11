# FinTrack

Aplikasi pencatat keuangan pribadi yang cepat, rapi, dan **100% offline**. Dibuat dengan HTML, CSS, dan JavaScript murni — tanpa framework, tanpa build step — lalu siap dibungkus menjadi aplikasi Android/iOS memakai Capacitor.

## Fitur

- **Beranda** — total saldo semua dompet, pemasukan, pengeluaran harian, tagihan wajib, sisa uang bebas, grafik donat kategori/alokasi, dan tren pengeluaran 14 hari.
- **Catat transaksi cepat** — pemasukan, pengeluaran, dan transfer antar dompet; kategori & dompet kustom; tanggal Hari ini/Kemarin/pilih sendiri; catatan.
- **Tagihan wajib bulanan** — daftar tagihan, jatuh tempo, penanda lunas/belum, reset otomatis tiap bulan, dan tombol "Tandai Semua Lunas". Membayar tagihan otomatis membuat transaksi pengeluaran yang terhubung.
- **Rencana** — target tabungan dengan progres, tambah/tarik dana, serta anggaran bulanan per kategori dengan indikator aman/kuning/merah.
- **Riwayat** — pencarian, filter tipe/kategori/dompet/rentang tanggal, dan pengelompokan per hari.
- **Pengaturan** — mode gelap, sembunyikan saldo, kelola dompet & kategori, ekspor JSON/CSV, impor JSON, dan reset data.
- **PWA** — dapat dipasang ke layar utama dan dipakai offline lewat service worker.
- **Data lokal** — semua data disimpan di `localStorage` (key `fintrack.v1`). Tidak ada server, akun, atau pelacakan.

## Menjalankan di browser

Butuh server lokal (jangan buka `index.html` langsung dengan `file://` karena service worker dan manifest memerlukan origin HTTP).

```bash
cd FinTrack-App

# Opsi 1 — tanpa install apa pun
python -m http.server 4173 --bind 127.0.0.1 --directory www

# Opsi 2 — Node.js
npm install
npm run serve
```

Buka **http://127.0.0.1:4173/**. Untuk mencoba di HP, jalankan server dengan `--bind 0.0.0.0` lalu buka `http://IP-KOMPUTER:4173/` dari jaringan yang sama.

Data contoh (demo) otomatis dibuat saat pertama kali dibuka. Reset kapan saja dari **Atur → Reset data**.

## Struktur proyek

```
FinTrack-App/
├─ www/                     # aplikasi web (isi webDir Capacitor)
│  ├─ index.html            # shell aplikasi
│  ├─ css/styles.css        # design system, tema, layout responsif
│  ├─ js/
│  │  ├─ utils.js           # format, tanggal, ikon, toast, sheet/modal
│  │  ├─ store.js           # state, localStorage, seed, ekspor/impor
│  │  ├─ charts.js          # grafik SVG (donat, garis, ring)
│  │  ├─ ui.js              # komponen & seluruh bottom-sheet
│  │  ├─ screens.js         # renderer Beranda/Riwayat/Tagihan/Rencana/Atur
│  │  └─ app.js             # router, refresh, navigasi, PWA
│  ├─ icons/                # favicon + ikon PWA (192/512/maskable)
│  ├─ fonts/                # Plus Jakarta Sans (self-hosted)
│  ├─ manifest.webmanifest
│  └─ sw.js                 # cache offline
├─ resources/               # sumber ikon & splash untuk build native
├─ scripts/
│  └─ set-android-version.mjs   # penulis versionCode/versionName saat build
├─ .github/workflows/
│  ├─ build-apk.yml         # build APK debug otomatis di GitHub Actions
│  └─ release-apk.yml       # build APK release bertanda tangan (manual)
├─ GITHUB_APK.md            # panduan build & instal APK lewat GitHub
├─ capacitor.config.json
├─ package.json
└─ package-lock.json
```

## Build APK lewat GitHub (tanpa Android Studio)

Project ini sudah dilengkapi GitHub Actions: begitu di-push ke GitHub, APK Android dibangun otomatis di server GitHub dan bisa diunduh dari tab **Actions → Artifacts**.

Ringkasnya:

1. Upload **isi** folder `FinTrack-App` ke root repository GitHub (jangan sampai menjadi `repo/FinTrack-App/www`).
2. Workflow **Build APK** berjalan otomatis; tunggu ±5–10 menit.
3. Unduh artefak `fintrack-apk-<nomor>`, ekstrak, lalu install `FinTrack-*-debug.apk` di HP.
4. Untuk rilis: buat tag `v1.0.1` → APK otomatis ditempel ke halaman **Releases**.
5. Untuk APK release bertanda tangan: isi 4 secret keystore → jalankan workflow **Build signed release APK**.

Panduan langkah demi langkah lengkap (termasuk keystore, troubleshooting, dan cara instal di Android) ada di **[GITHUB_APK.md](GITHUB_APK.md)**.

## Build Android

Prasyarat: **Node.js 22+**, **JDK 21**, dan **Android Studio** terbaru (dengan Android SDK).

```bash
cd FinTrack-App
npm install

# sekali saja — membuat folder android/
npx cap add android

# setiap kali www/ berubah
npx cap sync android
npx cap open android
```

Di Android Studio:

1. Tunggu Gradle sync selesai.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. APK debug ada di `android/app/build/outputs/apk/debug/app-debug.apk`.

Atau lewat terminal:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Untuk Play Store, buat **signed App Bundle** lewat **Build → Generate Signed Bundle / APK**.

## Build iOS

Prasyarat: **macOS**, **Xcode 16+**, dan **CocoaPods**.

```bash
cd FinTrack-App
npm install

# sekali saja — membuat folder ios/
npx cap add ios

# setiap kali www/ berubah
npx cap sync ios
npx cap open ios
```

Di Xcode: pilih target **App** → tab **Signing & Capabilities** → pilih Team → jalankan di simulator/device. Untuk App Store: **Product → Archive**.

## Ikon & splash native

Sumber ada di `resources/icon.png` (1024×1024) dan `resources/splash.png` (2732×2732). Setelah mengubahnya:

```bash
npm run assets
npx cap sync
```

Perintah ini memakai `@capacitor/assets` untuk menghasilkan ikon adaptive Android, AppIcon iOS, dan splash screen.

## Catatan teknis

- **Tanpa build step.** Semua script dimuat sebagai classic script agar bisa langsung dibuka dari server statis maupun WebView Capacitor.
- **Penyimpanan.** `Store` menyimpan state ke `localStorage` dan memberi tahu layar lewat event internal. Data tagihan yang sudah dibayar disimpan per bulan di `paidMonths`, sehingga bulan baru otomatis dimulai dari status belum dibayar.
- **Sinkronisasi tagihan.** Menandai tagihan lunas membuat transaksi pengeluaran dengan `billId` + `billMonth`. Membatalkan pembayaran menghapus transaksi tersebut. Mengubah nominal tagihan yang sudah dibayar ikut memperbarui transaksinya.
- **Uang bebas** = pemasukan − pengeluaran harian − seluruh tagihan wajib − setoran tabungan bulan ini.
- **Format angka** mengikuti locale Indonesia (`Rp 1.250.000`).
- **Service worker** memakai strategi *network-first* untuk navigasi dan *cache-first* untuk aset. Di dalam Capacitor, registrasi service worker dilewati karena aset sudah dikemas lokal — ini mencegah cache lama menutupi update aplikasi. Jika sedang mengembangkan di browser dan perubahan tidak muncul, naikkan versi `CACHE` di `www/sw.js` (mis. `fintrack-v1.0.1`) lalu reload — atau unregister service worker dari DevTools.
- **Ekspor/impor** memakai JSON lengkap (semua dompet, kategori, transaksi, tagihan, anggaran, target, pengaturan). CSV hanya berisi transaksi untuk Excel/Sheets.

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| Halaman putih / manifest error | Jalankan lewat HTTP server, bukan `file://`. |
| Perubahan tidak terlihat | Bump `CACHE` di `www/sw.js`, hard reload (Ctrl+Shift+R), atau unregister SW di DevTools → Application. |
| Data hilang setelah clear browser | Data hanya lokal. Pulihkan dari backup JSON lewat **Atur → Impor data**. |
| Perubahan web tidak masuk ke aplikasi native | Jalankan `npx cap sync` lalu rebuild. |
| `cap` tidak dikenal | Jalankan `npm install` lebih dulu, atau pakai `npx cap ...`. |
| Build Android gagal | Pastikan JDK 21 dan Android SDK terpasang; buka folder `android/` di Android Studio agar Gradle memakai JDK yang benar. |

---

FinTrack v1.0.0 · dibuat untuk ketenangan finansialmu.
