# Cofrinho

Cofrinho is an Android personal finance app based on the **zero-based budgeting** method: every real that comes in must be assigned to a spending category before it's used. The goal is to eliminate the "where did my money go?" question by answering it the moment money comes in, not after it's already gone. It's simple to set up, 100% offline-first (all data stored locally, with optional backup to your own Google Drive), has no automatic bank syncing, and is open source (MIT licensed). See [technical-specification.md](technical-specification.md) for the full product and data model reference.

## Running locally

This project targets a custom development build, not Expo Go. You'll need either an Android Studio emulator or a physical Android device.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build and run the development client on Android:

   ```bash
   npx expo run:android
   ```

This compiles a native Android project and installs the dev client on the emulator/device, then starts Metro. Subsequent runs can use `npm start` and reload the already-installed dev client.

## License

MIT — see [LICENSE](LICENSE).
