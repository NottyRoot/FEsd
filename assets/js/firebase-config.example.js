/* =========================================================================
   MMIT Portfolio Hub — Firebase Config (TEMPLATE)
   ---------------------------------------------------------------------------
   ไฟล์นี้ commit ขึ้น GitHub ได้ เพราะเป็นแค่ตัวอย่าง ไม่มีค่าจริง

   วิธีใช้งานจริง:
   1. copy ไฟล์นี้เป็นชื่อ  firebase-config.js   (อยู่โฟลเดอร์เดียวกัน)
   2. เติมค่าจริงของคุณแทน PASTE_... ทั้งหมด
   3. บันทึก — ไฟล์ firebase-config.js ถูก .gitignore กันไว้แล้ว
      จึงไม่มีทางหลุดขึ้น GitHub

   วิธีเอาค่าจริง: Firebase Console → Project settings (ไอคอนเฟือง)
                   → Your apps → Web (</>) → Register app

   ถ้ายังไม่วางค่าจริง หน้าเว็บจะรันใน Local Demo Mode
   (เก็บข้อมูลใน localStorage ของเครื่องคุณคนเดียว + แสดงแถบเตือนสีเหลือง)
   ========================================================================= */

const FIREBASE_CONFIG = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};

// ตรวจว่า user วาง config จริงแล้วหรือยัง — ค่า placeholder จะถูกตีเป็น false
const IS_FIREBASE_CONFIGURED = (function () {
    if (typeof FIREBASE_CONFIG !== 'object' || !FIREBASE_CONFIG) return false;
    const v = [FIREBASE_CONFIG.apiKey, FIREBASE_CONFIG.projectId, FIREBASE_CONFIG.appId];
    return v.every(x => typeof x === 'string' && x.length > 10 && !/^PASTE_/.test(x));
})();
