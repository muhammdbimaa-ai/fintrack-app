# Panduan Lengkap: Build & Instal APK FinTrack lewat GitHub

Panduan ini menjelaskan langkah demi langkah cara mengubah project FinTrack menjadi **APK Android** memakai **GitHub Actions** — tanpa perlu memasang Android Studio di komputer. Semua proses build berjalan di server GitHub.

> **Intinya:** upload project → GitHub build otomatis → download APK → install di HP.

---

## Daftar isi

1. [Yang perlu disiapkan](#1-yang-perlu-disiapkan)
2. [Struktur file yang wajib benar](#2-struktur-file-yang-wajib-benar)
3. [Langkah 1 — Buat repository GitHub](#langkah-1--buat-repository-github)
4. [Langkah 2 — Upload project ke GitHub](#langkah-2--upload-project-ke-github)
5. [Langkah 3 — Jalankan build APK](#langkah-3--jalankan-build-apk)
6. [Langkah 4 — Download APK](#langkah-4--download-apk)
7. [Langkah 5 — Instal APK di Android](#langkah-5--instal-apk-di-android)
8. [Langkah 6 — Update aplikasi ke versi baru](#langkah-6--update-aplikasi-ke-versi-baru)
9. [Langkah 7 — Rilis versi dengan tag (opsional)](#langkah-7--rilis-versi-dengan-tag-opsional)
10. [Langkah 8 — APK release bertanda tangan (opsional)](#langkah-8--apk-release-bertanda-tangan-opsional)
11. [Troubleshooting](#troubleshooting)
12. [Biaya & kuota GitHub Actions](#biaya--kuota-github-actions)
13. [Checklist cepat](#checklist-cepat)
14. [FAQ](#faq)

---

## 1. Yang perlu disiapkan

| Kebutuhan | Keterangan |
| --- | --- |
| Akun GitHub | Gratis di [github.com](https://github.com). |
| Folder `FinTrack-App` | Seluruh isi project ini (lihat struktur di bawah). |
| HP Android | Android 7.0+ (minSdk Capacitor). |
| Git (opsional) | Hanya jika ingin upload lewat terminal. Cara upload lewat browser juga tersedia. |
| Keystore (opsional) | Hanya untuk APK release bertanda tangan (Langkah 8). |

**Tidak perlu:** Android Studio, Android SDK, JDK, atau Node.js di komputer. Semua sudah disiapkan otomatis oleh workflow.

---

## 2. Struktur file yang wajib benar

Workflow GitHub hanya terdeteksi kalau file berada di **root repository** dengan susunan seperti ini:

```
nama-repo/
├─ .github/
│  └─ workflows/
│     ├─ build-apk.yml          # build APK debug (otomatis)
│     └─ release-apk.yml        # build APK release bertanda tangan (manual)
├─ www/                         # aplikasi web (isi webDir Capacitor)
│  ├─ index.html
│  ├─ manifest.webmanifest
│  ├─ sw.js
│  ├─ css/  js/  icons/  fonts/
├─ resources/
│  ├─ icon.png                  # 1024×1024
│  └─ splash.png                # 2732×2732
├─ scripts/
│  └─ set-android-version.mjs   # penulis versionCode/versionName saat build
├─ capacitor.config.json
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ README.md
```

> ⚠️ **Kesalahan paling sering:** meng-upload folder `FinTrack-App` sehingga menjadi `nama-repo/FinTrack-App/www/...`. Yang benar adalah **isi** folder `FinTrack-App` langsung di root repo: `nama-repo/www/...` dan `nama-repo/.github/...`.
>
> Folder `.github` diawali titik dan **tersembunyi di Windows**. Aktifkan **View → Hidden items** di File Explorer sebelum upload.

---

## Langkah 1 — Buat repository GitHub

1. Buka [github.com/new](https://github.com/new) (atau klik **+** di kanan atas → **New repository**).
2. Isi:
   - **Repository name:** `fintrack` (bebas, tanpa spasi).
   - **Description:** `Aplikasi keuangan pribadi offline — APK Android.`
   - **Visibility:** **Public** (build gratis tanpa batas menit) atau **Private** (lihat [kuota](#biaya--kuota-github-actions)).
3. **Jangan** centang *Add a README file*, *Add .gitignore*, atau *Choose a license* — project ini sudah punya semuanya. Kalau dicentang, akan terjadi konflik saat upload.
4. Klik **Create repository**.

---

## Langkah 2 — Upload project ke GitHub

Pilih **salah satu** cara. Cara A tidak butuh Git sama sekali.

### Cara A — Lewat browser (paling mudah)

1. Di halaman repo yang masih kosong, klik tautan **uploading an existing file**.
2. Buka folder `FinTrack-App` di File Explorer.
3. Pilih **semua isi folder** (Ctrl+A) — `www`, `resources`, `scripts`, `package.json`, `package-lock.json`, `capacitor.config.json`, `.github`, `.gitignore`, `README.md`, dll. **Bukan** folder `FinTrack-App`-nya.
4. Drag & drop ke area upload di browser. Tunggu sampai semua file terdaftar.
5. Di kolom commit message tulis `FinTrack v1.0.0`, lalu klik **Commit changes**.

**Kalau folder `.github` tidak ikut terupload** (karena tersembunyi / browser memblokir folder titik):

1. Klik **Add file → Create new file**.
2. Di kolom nama file, ketik persis: `.github/workflows/build-apk.yml` — GitHub otomatis membuat foldernya.
3. Buka file `FinTrack-App/.github/workflows/build-apk.yml` di komputer, copy seluruh isinya, paste ke editor GitHub.
4. **Commit changes**.
5. Ulangi untuk `.github/workflows/release-apk.yml`.

### Cara B — Lewat Git (terminal)

Jalankan dari dalam folder project:

```bash
cd "C:\Users\User\Documents\Default Project\FinTrack-App"

git init
git add .
git commit -m "FinTrack v1.0.0"
git branch -M main

# ganti USERNAME dengan username GitHub kamu
git remote add origin https://github.com/USERNAME/fintrack.git
git push -u origin main
```

Sebelum push, pastikan workflow ikut terdaftar:

```bash
git status --short | findstr ".github"
```

Baris `.github/workflows/build-apk.yml` harus muncul. Kalau tidak muncul, jalankan `git add .github -f` lalu commit ulang.

> **Login Git:** saat push pertama, GitHub meminta **Personal Access Token**, bukan password akun. Buat di **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**, centang scope **repo**, lalu pakai token itu sebagai password.

### Cara C — GitHub CLI

```bash
cd "C:\Users\User\Documents\Default Project\FinTrack-App"
gh repo create fintrack --public --source=. --remote=origin --push
```

---

## Langkah 3 — Jalankan build APK

Build pertama **berjalan otomatis** beberapa detik setelah commit/push ke branch `main` (workflow memicu `push` ke `main`/`master`).

Untuk menjalankan manual kapan saja:

1. Buka repository → tab **Actions**.
2. Di sidebar kiri pilih workflow **Build APK**.
3. Klik tombol **Run workflow** → pilih branch `main` → **Run workflow**.
4. Tunggu hingga selesai — biasanya **5–10 menit**.

Arti status:

| Status | Arti |
| --- | --- |
| 🟡 Queued | Menunggu server GitHub tersedia. |
| 🔵 In progress | Sedang build (install Node, JDK, Android SDK, Gradle). |
| ✅ Success | APK siap diunduh. |
| ❌ Failure | Buka job merah → lihat step yang gagal → cek [Troubleshooting](#troubleshooting). |

Klik job **Build debug APK** untuk melihat log tiap langkah: *Install dependencies*, *Create and sync Android project*, *Generate icons and splash screen*, *Set app version*, *Build APK*, *Upload APK artifact*.

---

## Langkah 4 — Download APK

1. Buka run yang berstatus ✅ (Actions → klik run terbaru).
2. Scroll ke bagian paling bawah halaman run.
3. Di kotak **Artifacts**, klik **`fintrack-apk-<nomor>`** (mis. `fintrack-apk-12`).
4. Browser mengunduh file `.zip`. **Ekstrak dulu** — APK ada di dalamnya:
   - Build dari branch: `FinTrack-main-debug.apk`
   - Build dari tag: `FinTrack-v1.0.1-debug.apk`

> Artefak disimpan **30 hari**, setelah itu terhapus otomatis. Untuk link download permanen, gunakan [Langkah 7 — rilis dengan tag](#langkah-7--rilis-versi-dengan-tag-opsional).
>
> Kamu harus login GitHub untuk mengunduh artefak, termasuk di repo publik.

---

## Langkah 5 — Instal APK di Android

1. Pindahkan file `.apk` ke HP: kabel USB, Google Drive, atau kirim ke diri sendiri lewat WhatsApp/Telegram/email.
2. Buka **Files** / **Pengelola Berkas** di HP → ketuk file APK.
3. Jika muncul *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Ketuk **Settings** → aktifkan **Allow from this source** → kembali.
4. Ketuk **Install**.
5. Jika Google Play Protect menampilkan *"Unsafe app blocked"* atau *"App scan recommended"*:
   - Ketuk **More details** → **Install anyway**.
   - Ini normal untuk APK di luar Play Store; build ini ditandatangani dengan debug key, bukan malware.
6. Setelah selesai, ketuk **Open** — FinTrack siap dipakai.

**Alternatif lewat ADB (opsional):**

```bash
adb install -r "FinTrack-main-debug.apk"
```

**Cek versi terpasang:** buka **Atur** di dalam aplikasi, atau **Settings → Apps → FinTrack → App info**.

---

## Langkah 6 — Update aplikasi ke versi baru

Setiap build baru otomatis mendapat `versionCode` yang lebih tinggi (diambil dari `GITHUB_RUN_NUMBER`), sehingga APK baru bisa **menimpa** versi lama tanpa uninstall.

1. Jalankan build baru (push perubahan, atau **Actions → Build APK → Run workflow**).
2. Download artefak terbaru dan ekstrak.
3. Ketuk APK → tombol berubah menjadi **Update** → **Install**.
4. Data lama **tetap aman** karena tersimpan di `localStorage` dan terikat pada `applicationId` + tanda tangan APK yang sama.

> ⚠️ **Pindah dari APK debug ke APK release (atau sebaliknya) akan gagal** dengan pesan *"App not installed"*, karena tanda tangannya berbeda. Solusinya: **Atur → Ekspor JSON** dulu, uninstall aplikasi, install APK baru, lalu **Atur → Impor data**. Data yang tidak dibackup akan hilang.

---

## Langkah 7 — Rilis versi dengan tag (opsional)

Tag membuat halaman **Release** berisi APK yang bisa dibagikan lewat link permanen.

**Lewat terminal:**

```bash
git tag v1.0.1
git push origin v1.0.1
```

**Lewat browser:**

1. Buka repo → **Releases** → **Draft a new release**.
2. Klik **Choose a tag** → ketik `v1.0.1` → **Create new tag on publish**.
3. Isi judul, mis. `FinTrack 1.0.1`, lalu **Publish release**.

Setelah tag dibuat, workflow **Build APK** berjalan otomatis dan:

- `versionName` diambil dari tag (`v1.0.1` → `1.0.1`);
- APK ditempel ke halaman Release oleh step *Publish GitHub Release*;
- APK juga tetap tersedia sebagai artefak.

Link unduhan untuk dibagikan: `https://github.com/USERNAME/fintrack/releases`

> Ubah juga `"version"` di `package.json` agar build dari branch memakai nomor yang sama.

---

## Langkah 8 — APK release bertanda tangan (opsional)

APK debug cukup untuk pemakaian sendiri. Untuk distribusi serius (atau agar tidak muncul peringatan debug), buat APK release bertanda tangan lewat workflow **Build signed release APK**.

### 8.1 Buat keystore (sekali saja)

Butuh JDK 21 (`keytool` ada di folder `bin` JDK). Jalankan:

```powershell
keytool -genkeypair -v -keystore fintrack-release.jks -alias fintrack -keyalg RSA -keysize 2048 -validity 10000
```

Isi nama, organisasi, kota, dan password. **Catat password-nya.**

> 🔐 Simpan `fintrack-release.jks` + password di tempat aman (password manager / backup terenkripsi). Kalau hilang, kamu **tidak bisa** merilis update untuk aplikasi yang sudah terpasang dengan kunci itu. File ini juga **tidak boleh** di-commit — `.gitignore` sudah mengecualikannya.

### 8.2 Ubah keystore menjadi Base64

**Windows PowerShell:**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("fintrack-release.jks")) | Set-Content -Encoding ascii -NoNewline keystore.b64
notepad keystore.b64
```

**macOS:**

```bash
base64 -i fintrack-release.jks -o keystore.b64
```

**Linux:**

```bash
base64 -w 0 fintrack-release.jks > keystore.b64
```

Buka `keystore.b64`, copy **seluruh isinya** (satu baris panjang tanpa spasi/baris baru).

### 8.3 Tambahkan Secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Buat empat secret:

| Nama secret | Isi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Seluruh isi `keystore.b64`. |
| `ANDROID_KEYSTORE_PASSWORD` | Password keystore. |
| `ANDROID_KEY_ALIAS` | `fintrack` (alias saat `keytool`). |
| `ANDROID_KEY_PASSWORD` | Password key (biasanya sama dengan password keystore). |

### 8.4 Jalankan build release

1. Tab **Actions** → sidebar **Build signed release APK** → **Run workflow** → **Run workflow**.
2. Tunggu selesai. Workflow akan:
   - `assembleRelease` → APK unsigned;
   - `zipalign` → menyelaraskan APK;
   - `apksigner sign` → menandatangani dengan keystore dari secret;
   - `apksigner verify` → menampilkan detail sertifikat di log.
3. Unduh artefak **`fintrack-signed-release-<nomor>`** → berisi `FinTrack-release.apk`.

### 8.5 Instal

Karena tanda tangannya berbeda dari versi debug, **uninstall FinTrack versi debug lebih dulu** (backup JSON dulu!), lalu install `FinTrack-release.apk`.

> Untuk Google Play Store, format yang diminta adalah **AAB (.aab)**, bukan APK. Workflow ini khusus APK untuk instalasi langsung (sideload). Jika perlu AAB, ganti `assembleRelease` menjadi `bundleRelease` dan unduh dari `android/app/build/outputs/bundle/release/`.

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
| --- | --- | --- |
| Tab **Actions** kosong / workflow tidak muncul | `.github/workflows` tidak ada di root repo, atau salah sarang (`FinTrack-App/.github/...`) | Pastikan path-nya `nama-repo/.github/workflows/build-apk.yml`. Buat ulang lewat **Add file → Create new file**. |
| Build gagal di step *Publish GitHub Release* (403) | Token workflow tidak punya izin tulis | **Settings → Actions → General → Workflow permissions** → pilih **Read and write permissions** → **Save**. |
| `npm ci` gagal: *package-lock.json ... not in sync* | `package.json` diubah tanpa memperbarui lockfile | Di komputer: `npm install` → commit `package-lock.json` baru → push. |
| Build gagal di step **Set up Android SDK** (`android-actions/setup-android`) | Action v3 masih Node 20 dan tidak cocok dengan runner Ubuntu 26.04 | Workflow terbaru **tidak lagi memakai action itu** — Android SDK sudah terpasang di runner. Samakan file workflow di repo dengan versi di project ini. |
| `SDK location not found` | `ANDROID_HOME` tidak terbaca | Jangan hapus step **Configure Android SDK**; step itu menulis `ANDROID_HOME` dan `sdk.dir` untuk Gradle. |
| Warning `Node.js 20 is deprecated` | Action versi lama | Workflow terbaru memakai `checkout@v5`, `setup-node@v5`, `setup-java@v5`, `upload-artifact@v5`. |
| `Unsupported class file major version` | JDK tidak cocok | Pastikan `java-version: 21`, `distribution: temurin`. |
| Gradle gagal mengunduh dependency | Gangguan jaringan di runner | Klik **Re-run failed jobs** — biasanya berhasil pada percobaan kedua. |
| Artifacts kosong / tidak ada tombol download | Build gagal, atau artefak lewat 30 hari | Perbaiki build; buat build baru. |
| *"App not installed"* saat install | Versi lama punya tanda tangan berbeda, atau penyimpanan penuh | Uninstall versi lama (backup JSON dulu), kosongkan ruang, install ulang. |
| *"There was a problem parsing the package"* | File masih di dalam ZIP, atau unduhan terputus | Ekstrak `.apk` dari ZIP, unduh ulang bila perlu. |
| Play Protect memblokir instalasi | APK di luar Play Store | **More details → Install anyway**. |
| Aplikasi putih setelah update | Cache WebView lama | Tutup paksa aplikasi, buka lagi. Bila tetap: **Settings → Apps → FinTrack → Storage → Clear cache**. |
| Signing gagal: *Failed to read key* | Password atau alias salah | Periksa `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. |
| Signing gagal: *keystore password was incorrect* | Base64 terpotong saat copy | Ulangi Langkah 8.2, pastikan satu baris utuh tanpa spasi baru. |
| Build lama menumpuk & lambat | Cache Gradle belum aktif | Normal. Build berikutnya lebih cepat; bisa tambahkan `actions/cache` bila perlu. |

---

## Biaya & kuota GitHub Actions

| Repo | Kuota |
| --- | --- |
| **Public** | Gratis, tanpa batas menit untuk runner standar. |
| **Private** (free plan) | 2.000 menit/bulan. Satu build APK ±5–10 menit → sekitar 200–400 build/bulan. |

Pengaturan yang dipakai workflow:

- `retention-days: 30` — artefak disimpan 30 hari.
- `concurrency: apk-<ref>` — build lama untuk branch yang sama dibatalkan bila ada build baru.
- `versionCode` = nomor run GitHub, `versionName` = tag `v*` atau `package.json`.

---

## Checklist cepat

- [ ] Isi folder `FinTrack-App` ada di **root** repo (bukan di dalam subfolder).
- [ ] `.github/workflows/build-apk.yml` terlihat di tab **Actions**.
- [ ] Build **Build APK** berstatus ✅.
- [ ] Artefak `fintrack-apk-<nomor>` terunduh dan **diekstrak**.
- [ ] APK berhasil diinstal dan FinTrack terbuka.
- [ ] (Opsional) Tag `v1.0.1` dibuat → APK muncul di halaman **Releases**.
- [ ] (Opsional) Empat secret signing terisi → **Build signed release APK** berhasil.

---

## FAQ

**Apakah perlu Android Studio?**
Tidak. GitHub Actions menyiapkan Node 22, JDK 21, Android SDK, dan Gradle secara otomatis.

**Apakah aplikasi tetap offline dan data aman?**
Ya. Tidak ada server, akun, atau pelacakan. Semua data tersimpan di `localStorage` perangkat. Backup lewat **Atur → Ekspor JSON**.

**Apa bedanya artefak dan Release?**
Artefak = file sementara di halaman run Actions (30 hari, perlu login). Release = halaman publik permanen berisi APK, dibuat dari tag.

**Kenapa nama APK `FinTrack-main-debug.apk`?**
Nama diambil dari nama branch/tag yang dibuild. Build dari tag `v1.0.1` menghasilkan `FinTrack-v1.0.1-debug.apk`.

**Bisakah build tanpa push ke `main`?**
Ya — jalankan manual lewat **Run workflow** dan pilih branch mana pun.

**Bagaimana build iOS?**
Butuh macOS + Xcode. GitHub menyediakan runner macOS, tetapi signing iOS memerlukan akun Apple Developer berbayar; di luar cakupan panduan ini. Lihat bagian *Build iOS* di `README.md` untuk langkah lokal.

**Kenapa APK debug lebih besar / muncul tulisan "debug"?**
Build debug menyertakan informasi debugging dan ditandatangani debug key. Untuk distribusi, gunakan APK release bertanda tangan (Langkah 8).

---

Butuh mengubah aplikasi? Edit file di `www/`, commit, dan GitHub akan membangun APK baru secara otomatis. Jangan lupa menaikkan `CACHE` di `www/sw.js` agar pengguna browser mendapat versi terbaru.
