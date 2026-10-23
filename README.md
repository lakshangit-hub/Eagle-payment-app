# Eagle Credit — Field Collection POS Mobile App (Sunmi V2)

A lightweight, secure native Android application for **Eagle Credit (PVT) LTD** microfinance and loan field officers, engineered specifically for **Sunmi V2 POS terminals** (Android 7.1.1, 1 GB RAM, built-in 58 mm thermal receipt printer).

---

## 1. System Architecture & Features

### UI / UX
- **Pixel-Accurate Fidelity:** Retains every screen, layout, flow, tactile numeric POS keypad, color palette, and wording from the Eagle Credit application without redesign.
- **Sunmi 720×1440 Display:** Native portrait-only lock, touch targets optimized for handheld single-hand operation.

### Target Platform & Runtime (Android 7.1.1 Compatible)
- **Engineered for Android 7 (Nougat / minSdk 24):** Vite legacy build target producing ES2015 JavaScript with polyfills for Chrome 53+ System WebViews.
- **Zero Modern API Crashes:** No dependency on `crypto.randomUUID`, `navigator.clipboard`, or `navigator.locks`. Complete polyfills and fallback mechanisms provided.
- **Lightweight Footprint:** Removed heavy unused dependencies (`@google/genai`, `express`, `dotenv`), keeping memory usage strictly under 1 GB RAM constraints.

### Device Security
- **Android Keystore-Backed Storage:** Authentication session tokens and offline payment vaults are encrypted with AES-256-GCM via `AndroidKeyStore`.
- **Fail Loudly:** If hardware encryption or decryption fails, it throws a `SecurityException` immediately with zero plaintext fallback.
- **Screenshot Protection:** `FLAG_SECURE` is enforced on the Android Activity window to block screen recordings and screenshots of borrower data.
- **Network Security:** Strict HTTPS enforcement with `cleartextTrafficPermitted="false"`, `allowBackup="false"`.
- **PIN & Inactivity Auto-Lock:** 5-minute inactivity timer and PIN lock screen (Default Officer PIN: `4020`).

### Payments & Offline Queuing
- **Save First, Sync Later:** Every field collection is committed to the local Keystore-encrypted vault first as `Pending Sync`.
- **Idempotency Receipt Keys:** Every payment receives a unique receipt number (`RC-YYMMDD-XXXXXX`). Duplicate postings are safely handled by the server.
- **Server Decides:** Never marks payments `Confirmed` locally. The Postgres RPC verifies borrower ownership, loan balance, and arrears before confirming.
- **Decoupled Thermal Printing:** Printing is completely separate from saving. A printer paper jam or hardware error never loses a transaction.
- **Duplicate Reprints:** Subsequent receipt prints are stamped `*** DUPLICATE RECEIPT ***` and recorded in the audit log.

### Backend (Supabase PostgreSQL with RLS & Append-Only Audit)
- **Supabase Auth:** Email/password authentication with role checking (`officer`, `admin`).
- **Default Deny RLS:** Row-level security restricts field officers to only their assigned customers and loan facilities.
- **Postgres RPC (`post_field_payment`):** `SECURITY DEFINER` function atomically locks facility records, checks balance, deducts arrears, records payment, and writes audit records.
- **Immutable Append-Only Audit Trail:** Revokes `UPDATE`, `DELETE`, and `TRUNCATE` permissions on `public.audit_logs` for all roles, backed by a trigger that raises exceptions on any tampering.

---

## 2. Directory Structure

```
├── app/                                 # Native Android Module (Gradle)
│   ├── src/main/
│   │   ├── aidl/woyou/aidlservice/jiuv5/# Sunmi V2 58mm Printer AIDL Service
│   │   ├── assets/public/               # Compiled ES2015 Webview Assets
│   │   ├── java/com/example/
│   │   │   ├── MainActivity.kt          # FLAG_SECURE & Hardware WebView Host
│   │   │   ├── bridge/AndroidBridge.kt  # JS Bridge (Keystore & Thermal Printer)
│   │   │   ├── printer/SunmiPrinterManager.kt # 32-col ESC-POS Thermal Formatter
│   │   │   └── security/KeystoreStorage.kt    # AES-256-GCM Keystore Storage
│   │   ├── res/                         # Android Resources & Custom Launcher Icon
│   │   └── AndroidManifest.xml          # Portrait, HTTPS, AllowBackup=false
│   └── build.gradle.kts                 # Android Gradle Configuration (minSdk 24)
├── frontend/                            # React 18 & Tailwind v3 Web Application
│   ├── src/
│   │   ├── components/                  # Exact Eagle Credit Screens & Modals
│   │   ├── services/
│   │   │   ├── nativeBridge.ts          # Hardware Bridge Interface
│   │   │   ├── supabase.ts              # Supabase Client with Keystore Auth
│   │   │   └── vault.ts                 # Offline Encrypted Ledger & Idempotency
│   │   ├── utils/                       # LK Currency & Audio POS Feedback
│   │   ├── App.tsx                      # Primary Workflow & State Orchestration
│   │   └── types.ts                     # Customer, Facility, and Payment Types
│   ├── package.json                     # React 18, Tailwind 3, Vite Legacy
│   └── vite.config.ts                   # ES2015 & Chrome 53 Legacy Build
├── supabase/
│   ├── schema.sql                       # Complete Tables, RLS, RPCs, & Audit Triggers
│   └── seed.sql                         # Portfolio Seed Data for Field Testing
└── settings.gradle.kts                  # Gradle Root Project Configuration
```

---

## 3. Short Build Steps for Production APK

### Step 1: Compile Frontend Assets
Build the React 18 application with legacy ES2015 support into `app/src/main/assets/public/`:
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 2: Assemble Signed Android APK
Compile the Android application using Gradle:
```bash
# To assemble the signed debug APK:
gradle :app:assembleDebug

# To assemble the release APK:
gradle :app:assembleRelease
```

The resulting production-ready APK is generated at:
```
app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Install on Sunmi V2 POS Terminal
Connect the Sunmi V2 via USB or deploy via MDM/Sunmi Partner Cloud:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Backend (Supabase) Setup Instructions

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor**.
3. Run the complete contents of `supabase/schema.sql` to provision:
   - `profiles`, `customers`, `facilities`, `guarantors`, `payments`, and `audit_logs` tables.
   - Row-Level Security policies with default deny.
   - The `post_field_payment` atomic payment RPC.
   - The `log_reprint` duplicate receipt audit RPC.
   - Append-only immutability triggers on `audit_logs`.
4. Run `supabase/seed.sql` to populate initial test customers and loan facilities.
5. In `frontend/.env` (or environment variables), set:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```
