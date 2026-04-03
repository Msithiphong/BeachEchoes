# BeachEchoes AR Feature Testing Guide

This guide explains how to test the AprilTag-based AR anchoring feature in the BeachEchoes app on a real device.

---

## Prerequisites
- **Expo development build** (custom dev client, not Expo Go)
- **Physical device** (iPhone with ARKit support or Android with ARCore)
- **AprilTag printout** (tag36h11 family, matching a tag_id in your Neon DB)
- **Neon database** with migrations applied
- **Backend server** running and connected to Neon

---

## 1. Build and Install the Expo Dev Client

### iOS (Free Apple Developer Account)
1. Open `ios/beachechoes.xcworkspace` in Xcode.
2. Sign in with your Apple ID (free account is OK).
3. Connect your iPhone via USB.
4. Select your device as the build target.
5. In the Signing tab, select your Apple ID team.
6. Build and run (Cmd+R). Trust the developer profile on your phone if prompted.

### Android
1. Run `npx expo run:android` with your device connected or emulator running.

---

## 2. Start the Metro Bundler
```sh
npx expo start
```
- Scan the QR code with your dev client app to load the JS bundle.

---

## 3. Test the AR Feature
1. Navigate to the AR screen in the app.
2. Point your phone at a valid AprilTag printout.
3. Confirm:
   - AR session starts (camera view, no errors)
   - Floor is detected ("Floor detected" banner)
   - AprilTag is detected (anchor resolves, echo placement UI appears)
   - You can place an echo (card appears in AR, persists in Neon DB)
   - Recalibration/fallback works if you lose tracking

---

## 4. Backend Verification
- Check the `ar_echoes` table in Neon for new echo records.
- Check the `zones` and `zone_apriltags` tables for correct metadata.

---

## 5. Debugging
- Use `console.log` in JS (output in Metro terminal)
- For native logs:
  - iOS: Xcode > Devices and Simulators > View device logs
  - Android: `adb logcat | grep BeachEchoesAR`
- Check backend logs for API/database errors

---

## 6. Common Issues
- **Expo Go does not support custom AR modules** — always use the dev client.
- **iOS app expires after 7 days** with free Apple account — rebuild via Xcode as needed.
- **AprilTag not detected?**
  - Check lighting, camera focus, and that the tag_id matches a record in Neon.
- **Echo not saved?**
  - Check backend logs and Neon DB connection.

---

## 7. Advanced
- Test with multiple zones and tags.
- Test fallback to map/list view.
- Test on both iOS and Android if possible.

---
