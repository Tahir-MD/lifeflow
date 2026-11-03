#!/usr/bin/env bash
# Builds the web app and creates/updates the Android project.  Run from the frontend/ folder.
#   1) put your Firebase file at  frontend/google-services.json   (see ANDROID.md)
#   2) VITE_API_URL must point at your deployed https backend (frontend/.env.production)
set -euo pipefail
cd "$(dirname "$0")/.."

npm install
[ -d android ] || npx cap add android
npm run build
npx cap sync android

# --- apply our Android extras ---
RES=android/app/src/main/res
mkdir -p "$RES/xml"
cp android-overrides/network_security_config.xml "$RES/xml/network_security_config.xml"

MANIFEST=android/app/src/main/AndroidManifest.xml
if ! grep -q networkSecurityConfig "$MANIFEST"; then
  sed -i 's#<application#<application android:networkSecurityConfig="@xml/network_security_config"#' "$MANIFEST"
fi
if ! grep -q POST_NOTIFICATIONS "$MANIFEST"; then
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>#' "$MANIFEST"
fi

if [ -f google-services.json ]; then
  cp google-services.json android/app/google-services.json
else
  echo "WARNING: google-services.json not found -- the app will build but push notifications will not work."
fi

# --- app icons from the PWA icon ---
if command -v npx >/dev/null 2>&1; then
  npx --yes @capacitor/assets generate --android --iconBackgroundColor '#c8102e' --assetPath assets 2>/dev/null || \
    echo "(Skipped icon generation; the default icon is used. See ANDROID.md.)"
fi

echo
echo "Done. Next:  npx cap open android   -> Build > Generate Signed Bundle / APK"
