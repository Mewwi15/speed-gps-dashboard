# SPEED GPS — โน้ตสำหรับคนทำงานต่อ

แอปวัดความเร็วจาก GPS พร้อมบันทึกเส้นทาง (Expo / React Native) เป้าหมายคือขึ้น **iOS App Store**

## เวอร์ชันที่ใช้จริง

**Expo SDK 54** — อ่าน docs ตามเวอร์ชันนี้เท่านั้น: https://docs.expo.dev/versions/v54.0.0/

## โครงสร้าง

```
app/
  _layout.tsx        Settings → Location → Trips providers + Stack (ไม่มี header)
  index.tsx          หน้าเดียว สลับ GAUGE/MAP ด้วย toggle + ปุ่มอัดทริป
  history.tsx        รายการทริปที่บันทึกไว้
  trip/[id].tsx      เปิดทริป: แผนที่ + เล่นย้อน + สถิติ
components/
  GaugePanel.tsx     หน้าปัดความเร็ว + การ์ดสถิติ + แถบตั้งค่า
  RouteMap.tsx       แผนที่ ใช้ทั้งตอนขับสดและตอนดูทริปเก่า
contexts/
  LocationContext.tsx  GPS subscription เดียวของทั้งแอป + โหมดสาธิต
  SettingsContext.tsx  mode / unit / สี accent ที่ทุกหน้าใช้ร่วมกัน
  TripsContext.tsx     อัดทริป + เก็บลง AsyncStorage
constants/
  speed.ts     หน่วย โหมด ขอบเขตหน้าปัด และสีไล่ตามความเร็ว
  theme.ts     สี ความโค้ง เงา
  demoDrive.ts สคริปต์ขับจำลองสำหรับพรีเซนต์
```

**ห้ามวางไฟล์ที่ไม่ใช่หน้าจอไว้ใน `app/`** — expo-router มองทุกไฟล์ในนั้นเป็น route
(เดิมมี `app/utils/useLocation.tsx` ซึ่งกลายเป็น route ผี `/utils/useLocation`)

## ข้อควรรู้ก่อนแก้โค้ด

- **`useLocation()` ต้องอ่านจาก Context เท่านั้น** ห้ามเรียก `watchPositionAsync` เพิ่ม
  ไม่งั้นได้ GPS subscription ซ้อนกัน เปลืองแบตเท่าตัวและสถิติจะไม่ตรงกันระหว่างหน้า
- **แผนที่:** ใช้ `react-native-maps@1.20.1` แบบ **ไม่ระบุ provider** → iOS ได้ Apple Maps (ธีมมืดผ่าน
  `userInterfaceStyle`) / Android ได้ Google Maps
  `PROVIDER_GOOGLE` ใช้ได้ใน Expo Go บน iOS แต่ **แอปจริงต้องมี API key ของตัวเอง + เปิด billing**
  และ `userInterfaceStyle` ไม่มีผลกับ Google Maps ต้องเขียน `customMapStyle` เอง
- **Polyline ไล่สีต้องตัดเป็นช่วง ๆ** — prop `strokeColors` รองรับแค่ Android
- **ไม่ใช้ไอคอนแล้ว** ทั้งแอปเป็นตัวอักษรล้วน `@expo/vector-icons` กับ `expo-font` ยังอยู่ใน
  dependencies แต่ไม่มีใครเรียก ลบได้ถ้าไม่คิดจะกลับไปใช้
- **ฟอนต์ใช้ของระบบ** เคยลอง Playfair Display แล้วไม่เวิร์ก — เป็น display face
  ตัวบางหายที่ขนาดเล็ก และตัวเลขความกว้างไม่เท่ากันทำให้นาฬิกากระตุก

## โหมดสาธิต

เปิดจากปุ่ม THEME → DEMO DRIVE ใช้พรีเซนต์โดยไม่ต้องขับจริง
เล่นสคริปต์ใน `constants/demoDrive.ts` (ในเมือง → ติดไฟแดง → ทางด่วนแตะโซนแดง → กลับเข้าเมือง)
ยึดจุดเริ่มจากตำแหน่งจริงล่าสุด ถ้ายังไม่มี fix ใช้กรุงเทพฯ เป็นค่าสำรอง

**ต้องมีแถบ DEMO DRIVE — SIMULATED DATA ค้างบนจอเสมอตอนเปิดโหมดนี้** และทริปที่อัดตอน demo
ถูกติดธง `isDemo` ไว้ อย่าถอดออก ข้อมูลจำลองต้องไม่ถูกเข้าใจผิดว่าเป็นของจริง

## ข้อกำหนด App Store ที่ต้องไม่ทำพัง

- ข้อความขอสิทธิ์ตำแหน่งใน `app.json` ต้อง**ระบุจุดประสงค์ชัดเจน** ไม่งั้นโดน reject ตาม Guideline 5.1.1
- ข้อความปัจจุบันพูดถึง "record your top and average speed, and show your route on the map"
  ซึ่งตอนนี้ตรงกับฟังก์ชันจริงแล้ว ถ้าตัดฟีเจอร์ไหนออกต้องแก้ข้อความตาม
- legend กับปุ่มบนแผนที่ต้องไม่บัง **"Maps / Legal"** ของผู้ให้บริการแผนที่
