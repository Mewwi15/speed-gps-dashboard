# SPEED GPS — โน้ตสำหรับคนทำงานต่อ

แอปวัดความเร็วจาก GPS (Expo / React Native) เป้าหมายคือขึ้น **iOS App Store**

## เวอร์ชันที่ใช้จริง

**Expo SDK 57** — อ่าน docs ตามเวอร์ชันนี้เท่านั้น: https://docs.expo.dev/versions/v57.0.0/

> เดิมไฟล์นี้เขียนว่า v54 ซึ่งไม่ตรงกับ `package.json` แก้แล้วเมื่อ 15 ก.ย. 2026

## ข้อควรรู้ก่อนแก้โค้ด

- **แผนที่:** ตั้งใจใช้ `react-native-maps` แบบ **ไม่ระบุ provider** → iOS ได้ Apple Maps / Android ได้ Google Maps
  ไม่ใช้ `PROVIDER_GOOGLE` เพราะต้องมี API key + Google Cloud billing และยังมีบั๊กกับ New Architecture
  (โปรเจกต์นี้เปิด `newArchEnabled: true`)
- **`useLocation()` สร้าง `watchPositionAsync` ของตัวเองทุกครั้งที่ถูกเรียก**
  ห้ามเรียกจากหลายหน้าจอ ต้องยกขึ้นเป็น Context ก่อน ไม่งั้นได้ GPS subscription ซ้อนกัน
- **dependency ที่ grep ไม่เจอใน `app/` แต่ห้ามลบ:**
  `react-native-reanimated`, `react-native-gesture-handler` (peer ของ expo-router),
  `expo-font` (ใช้ตอน runtime โดย `@expo/vector-icons`),
  `@react-navigation/bottom-tabs` (แผนจะใช้ทำแท็บ COCKPIT/MAP)

## ข้อกำหนด App Store ที่ต้องไม่ทำพัง

- ข้อความขอสิทธิ์ตำแหน่งใน `app.json` ต้อง**ระบุจุดประสงค์ชัดเจน** ไม่งั้นโดน reject ตาม Guideline 5.1.1
- ข้อความปัจจุบันพูดถึง "route on the map" — **ต้องมีแผนที่จริงก่อนส่ง review**
