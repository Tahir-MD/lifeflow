@echo off
rem Builds the web app and creates/updates the Android project (Windows). Run from the frontend folder.
cd /d "%~dp0\.."
call npm install || exit /b 1
if not exist android call npx cap add android || exit /b 1
call npm run build || exit /b 1
call npx cap sync android || exit /b 1
if not exist android\app\src\main\res\xml mkdir android\app\src\main\res\xml
copy /Y android-overrides\network_security_config.xml android\app\src\main\res\xml\network_security_config.xml
findstr /C:"networkSecurityConfig" android\app\src\main\AndroidManifest.xml >nul || powershell -Command "(Get-Content android\app\src\main\AndroidManifest.xml) -replace '<application','<application android:networkSecurityConfig=\"@xml/network_security_config\"' | Set-Content android\app\src\main\AndroidManifest.xml"
findstr /C:"POST_NOTIFICATIONS" android\app\src\main\AndroidManifest.xml >nul || powershell -Command "(Get-Content android\app\src\main\AndroidManifest.xml) -replace '</manifest>','    <uses-permission android:name=\"android.permission.POST_NOTIFICATIONS\" />`n</manifest>' | Set-Content android\app\src\main\AndroidManifest.xml"
if exist google-services.json (copy /Y google-services.json android\app\google-services.json) else (echo WARNING: google-services.json not found - push notifications will not work.)
echo.
echo Done. Next: npx cap open android  -^>  Build ^> Generate Signed Bundle / APK
