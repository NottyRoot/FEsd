# ตั้งค่า MMIT Portfolio Hub ให้ใช้ข้อมูลจริง

ตอนนี้เว็บ **ไม่มีข้อมูลปลอมแล้ว** — ไลค์ คะแนนเฉลี่ย และฟีดแบ็ก ทุกตัวเลขมาจากฐานข้อมูลจริงทั้งหมด
ถ้ายังไม่ตั้งค่า Firebase หน้าเว็บจะรันใน **Local Demo Mode** (เก็บข้อมูลใน browser เครื่องคุณคนเดียว)
และจะมีแถบสีเหลืองเตือนที่ด้านบนของหน้า

ใช้เวลาตั้งค่าครั้งเดียวประมาณ 5 นาที

---

## 1. สร้าง Firebase Project

1. เปิด <https://console.firebase.google.com> → **Create a project**
2. ใส่ชื่อ เช่น `mmit-portfolio-hub` → Continue
3. Google Analytics → ปิดได้ (ไม่จำเป็น) → **Create project**

## 2. เปิด Anonymous Authentication

**Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save**

ขั้นตอนนี้สำคัญมาก เป็นสิ่งที่บังคับ "1 คน 1 โหวต" เพราะ Firebase จะออก UID ให้ผู้เข้าชมแต่ละคน
และ security rules จะใช้ UID นั้นเป็น key ของ document โหวต

## 3. สร้าง Firestore Database

**Build → Firestore Database → Create database**

- เลือก **Production mode** (ไม่ใช่ Test mode — Test mode เปิดให้ใครก็เขียนได้)
- เลือก region ใกล้ที่สุด เช่น `asia-southeast1` (Singapore)

## 4. วาง Security Rules

 Firestore Console → แท็บ **Rules** → ลบของเดิมออกทั้งหมด → วางเนื้อหาไฟล์ [`firestore.rules`](./firestore.rules) → **Publish**

สิ่งที่ rules ป้องกัน:

| ป้องกัน | วิธี |
|---|---|
| คนเดียวกันโหวตซ้ำ | document ใช้ `uid` เป็น key → ซ้ำ = ทับ doc เดิม = นับ 1 |
| แก้ไขคะแนนย้อนหลัง | `allow update, delete: if false` กับ feedback |
| ใส่ข้อมูลยาวเกินจริง | rules เช็ค `author ≤ 60`, `comment ≤ 500` |
| คะแนนนอกช่วง 1–5 | rules เช็ค `rating is int` และ `1 ≤ rating ≤ 5` |
| สร้าง doc โปรเจกต์ปลอม | client ห้ามเขียนที่ collection `projects` ระดับบน |

## 5. วาง Firebase Config

**Project settings (ไอคอนเฟือง) → Your apps → Web (`</>`) → Register app**

Firebase จะให้โค้ดแบบนี้มา:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mmit-portfolio-hub.firebaseapp.com",
  projectId: "mmit-portfolio-hub",
  storageBucket: "mmit-portfolio-hub.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

จากนั้น copy ไฟล์ template แล้วเติมค่าจริง:

```bash
copy assets\js\firebase-config.example.js assets\js\firebase-config.js
```

แล้วเปิด `assets/js/firebase-config.js` เติมค่าจริงแทน `PASTE_...` ทั้งหมด บันทึก

รีเฟรชหน้า → แถบสีเหลืองจะหายไป ตัวเลขทั้งหมดจะเป็น 0 รอคนโหวตจริง

> ⚠️ `assets/js/firebase-config.js` ถูก `.gitignore` กันไว้แล้ว จึง commit ขึ้น GitHub ไม่ได้โดยไม่ตั้งใจ
> บน GitHub จะมีแค่ `firebase-config.example.js` (ค่า placeholder)

---

## 6. Deploy ขึ้น GitHub Pages

GitHub Pages **ไม่เอาไฟล์ที่ gitignore ขึ้นไปด้วย** ถ้า push ตรงๆ เว็บจะไม่มี `firebase-config.js`
และจะค้างอยู่ใน Local Demo Mode ตลอด จึงต้องใช้ `deploy.ps1`

```powershell
cd "C:\Users\Notty\Desktop\Portfolio"
.\deploy.ps1
```

สิ่งที่ script ทำ:

| ขั้น | ทำอะไร |
|---|---|
| 1 | ตรวจว่า config มีค่าจริง (ไม่ใช่ `PASTE_`) และ `apiKey` ขึ้นต้น `AIza` |
| 2 | ตรวจว่า working tree สะอาดและอยู่บน branch `main` |
| 3 | build ไฟล์ลง `.deploy/` แล้วฉีด `firebase-config.js` จริงเข้าไป |
| 4 | push ขึ้น branch `gh-pages` แบบ orphan (สร้างใหม่ทุกครั้ง) |
| 5 | เช็คผลบน GitHub และเปิด Pages ให้อัตโนมัติถ้ายังไม่ได้เปิด |

ดู build ก่อนโดยไม่ push:

```powershell
.\deploy.ps1 -DryRun
```

**ผลลัพธ์:**

```
main      -> ไม่มี config เลย ใช้ดู source ได้สะอาด
gh-pages  -> มี config ซึ่งจำเป็นต้อง public อยู่แล้ว (Pages serve จากตรงนี้)
```

> ⚠️ **ความจริงที่ควรรู้:** Firebase web API key **เป็น public โดยการออกแบบ**
> เพราะ browser ทุกเครื่องที่เปิดเว็บต้องอ่านค่านี้ได้ จึงไม่มีทางซ่อนไว้ได้จริง
> การแยก `main` ออกจาก `gh-pages` แค่ทำให้ source history สะอาด
> ความปลอดภัยที่แท้จริงมาจาก **Firebase Security Rules** ใน `firestore.rules`
> ซึ่งคุณวางไปแล้วในขั้นตอน 4 ถ้าข้ามขั้นตอนนั้น database จะเปิดให้ใครเขียนได้หมด

ใช้ token อะไร push — script อ่านจาก environment variable `GH_TOKEN` หรือส่ง `-Token`:
```powershell
$env:GH_TOKEN = "ghp_xxxxxxxx"
.\deploy.ps1
```
Token ถูกส่งแบบ one-shot ผ่าน HTTP header เท่านั้น ไม่ถูกเขียนลง `.git/config` หรือ remote URL

---

## โครงสร้างไฟล์

```
index.html
firestore.rules                    ← คัดลอกไปวางใน Firebase Console
deploy.ps1                         ← build + push ขึ้น GitHub Pages
SETUP.md                           ← คู่มือตั้งค่า
.gitignore                         ← กัน firebase-config.js และ .deploy/ หลุดขึ้น GitHub
assets/
├── css/style.css                  ← glassmorphism, keyframes, reduced-motion
└── js/
    ├── data.js                    ← เนื้อหาโปรเจกต์ล้วน (ไม่มีตัวเลข)
    ├── firebase-config.example.js ← template ที่ commit ขึ้น GitHub ได้
    ├── firebase-config.js         ← ⚠️ คุณสร้างเองจาก example, ไม่ขึ้น main
    ├── store.js                   ← data layer: Firestore + local fallback
    └── app.js                     ← logic หน้าเว็บ
```

## โครงข้อมูลบน Firestore

```
projects/{projectId}/likes/{uid}
    { createdAt: <serverTimestamp> }
    → 1 doc ต่อ 1 คนต่อ 1 โปรเจกต์

feedback/{autoId}
    { uid, projectId, projectTitle, author, rating, comment, createdAt }
```

ไม่มีการเก็บตัวเลขสรุป (counter) ไว้ใน database เลย ไลค์ถูกนับจากจำนวน document จริง
จึงไม่มีทาง drift หรือตัวเลขไม่ตรงกัน

---

## ข้อจำกัดที่ควรรู้

**Anonymous Auth กันได้ระดับ "1 browser 1 ตัวตน"** ไม่ใช่ระดับบุคคลจริง ถ้าใครล้าง storage
หรือใช้อุปกรณ์ใหม่ก็จะได้ UID ใหม่และโหวตเพิ่มได้ ถ้าจะกันแน่นกว่านี้ให้เปิด **App Check**
(Firebase Console → App Check → ผูกกับ reCAPTCHA v3) ซึ่งจะผูกตัวตนกับบราวเซอร์ได้เหนือกว่า

**Free tier ของ Spark plan** ให้ 50K reads / 20K writes ต่อวัน
พอสำหรับงานนิทรรศการหรือชั้นเรียนสบายๆ แต่ถ้ามี traffic มากควรเช็ค Usage

**ข้อมูลไม่มีการลบอัตโนมัติ** ฟีดแบ็กที่ส่งไปแล้วแก้ไขและลบไม่ได้ตาม rules
ถ้ามี spam ให้ลบมือจาก Firebase Console ได้เลย (คุณเป็น admin ลบได้เสมอ)
