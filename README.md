# Cofrinho

Cofrinho is an Android personal finance app based on the **zero-based budgeting** method: every real that comes in must be assigned to a spending category before it's used. The goal is to eliminate the "where did my money go?" question by answering it the moment money comes in, not after it's already gone. It's simple to set up, 100% offline-first (all data stored locally, with optional backup to your own Google Drive), has no automatic bank syncing, and is open source (MIT licensed). See [technical-specification.md](technical-specification.md) for the full product and data model reference.

## Features

- Accounts (cash, credit cards, loans/financing, tracking-only) with balances always recomputed from transaction history — never a value that can drift out of sync.
- Zero-based budgeting: assign every real to a category until Ready to Assign reaches zero, with category groups, targets, and an overspending "cover from another category" shortcut.
- The credit card float mechanic and loan amortization-on-payment, exactly as described in the spec's §2.4 and §8.3.
- Transactions (outflow, inflow, transfer, credit card payment) with filters, text search, payee autocomplete, and quick actions.
- Reports: spending breakdown by category, income vs. spending by month, and a net worth trend.
- Optional Google Drive backup (requesting only the `drive.file` scope — never full Drive access), manual or automatic on app foreground/background.
- A pre-built color theme catalog (light/dark/system-aware) and full `pt-BR`/`en` translations, switchable at runtime.

## Running locally

This project targets a custom development build, not Expo Go — a few native modules used here (secure storage, Google sign-in) aren't available in the Expo Go sandbox. You'll need either an Android Studio emulator or a physical Android device with USB debugging enabled.

### Prerequisites

- Node.js and npm.
- Android Studio, with an emulator configured (or a physical device).
- A JDK on `JAVA_HOME`. If `npx expo run:android` fails with "JAVA_HOME is not set", point it at the JDK Android Studio already ships with, e.g. on Windows:
  ```bash
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  ```
  (set it permanently via your OS's environment variables so you don't have to repeat this every session.)

### 1. Install dependencies

```bash
npm install
```

### 2. (Optional) configure Google Drive backup

Backup is entirely optional — the app works fully without it, with the Backup screen simply showing "not configured". To enable it:

```bash
cp .env.example .env
```

Then follow the setup steps in [src/lib/googleDrive/auth.ts](src/lib/googleDrive/auth.ts) to create your own Google Cloud OAuth client (must be a **Desktop app** type client, not Web application) and paste its client ID into `.env` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

### 3. Build and run the development client

```bash
npx expo run:android
```

This compiles a native Android project and installs the dev client on the emulator/device, then starts Metro. Subsequent runs can use `npm start` and reload the already-installed dev client — only re-run `expo run:android` after adding/changing a native dependency.

## Building an installable APK (EAS Build)

To get a shareable, installable `.apk` without a local Android build environment, use [EAS Build](https://docs.expo.dev/build/introduction/) (free tier). This repo already ships an [eas.json](eas.json) with a `preview` profile configured to produce an APK (rather than the Play-Store-only `.aab` format).

1. Install the CLI and sign in (creates a free Expo account if you don't have one):
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Link this project to your Expo account (one-time; writes a project ID into `app.json`):
   ```bash
   eas build:configure
   ```
3. If you want Google Drive backup in the built app, add your client ID as an EAS environment variable (`.env` is local-only and isn't picked up by cloud builds):
   ```bash
   eas env:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "your-client-id.apps.googleusercontent.com" --environment preview
   ```
4. Start the build:
   ```bash
   eas build --platform android --profile preview
   ```
   This uploads the project and builds it on Expo's servers — no local Android SDK/JDK needed. When it finishes, the terminal (and your Expo dashboard) print a download link for the `.apk`; download it to your device and install it (you'll need to allow installs from your browser/file manager, since it isn't from the Play Store).

## Testing

```bash
npm test           # full Jest suite
npm run test:coverage
npm run lint        # expo lint
```

Coverage is tiered by risk, not a flat target — see [CLAUDE.md](CLAUDE.md)'s Testing & Coverage section: core budget-math modules under `src/lib/` aim for ~100% coverage, while screens/components are tested for meaningful behavior rather than chased for a number.

## License

MIT — see [LICENSE](LICENSE).
