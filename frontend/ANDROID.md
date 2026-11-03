# LifeFlow Android app (Capacitor)

The Android app is the same React app, wrapped by [Capacitor](https://capacitorjs.com). It installs from an APK/AAB,
works offline for pages you have opened, and receives **native push notifications through Firebase Cloud Messaging (FCM)**.

You need on your computer: Node 18+, **Android Studio** (it brings the Android SDK and JDK), and a free Firebase account.

## 1. Deploy the backend over https
The phone cannot reach `127.0.0.1` on your PC. Deploy the backend (Render, Railway, a VPS ...) and put its address in
`frontend/.env.production`:

    VITE_API_URL=https://your-backend.example.com

(For a quick test on the Android *emulator* with the backend running on your PC, use `http://10.0.2.2:8000` — the
included `network_security_config.xml` allows exactly that and nothing else.)

## 2. Firebase (for push)
1. https://console.firebase.google.com → **Add project** → **Add app → Android**, package name `app.lifeflow.bloodbank`.
2. Download **google-services.json** and put it in `frontend/` (next to `package.json`).
3. Project settings → **Service accounts** → **Generate new private key**. Save it on the *server* and set
   `FCM_SERVICE_ACCOUNT_FILE=/path/to/that-file.json` (or put the JSON in `FCM_SERVICE_ACCOUNT_JSON`).
   `pip install google-auth` on the server (it is in requirements.txt).

Without these two files the app still works — only push alerts are off.

## 3. Build
    cd frontend
    ./scripts/build-android.sh        # Windows: scripts\build-android.bat
    npx cap open android

This installs packages, creates the `android/` folder (first time), builds the web app, copies it in, and applies the
LifeFlow extras (notification permission, network config, Firebase file, icons).

In Android Studio: plug in a phone (USB debugging on) or start an emulator and press **Run ▶**.

## 4. Release
Android Studio → **Build → Generate Signed Bundle / APK**. Create a keystore once and **back it up** — you need the same
one for every update. Upload the `.aab` to Google Play (or share the `.apk` directly).

After you change the React code: `npm run android:sync`, then run/build again.

## Notes
* The service worker is not used inside the Android app (its files are already on the phone); the browser/PWA version
  keeps using it.
* Notification channel id: `lifeflow_alerts`. Tapping a notification opens the `url` the server sent.
* Before publishing, remove the `<domain-config>` (10.0.2.2) block from `android-overrides/network_security_config.xml`.
* Not tested here: this package was prepared without Android Studio or network access. Expect to fix small things on the
  first build and tell me what the error says.
