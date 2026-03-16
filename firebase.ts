// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
const firebaseConfig = {
  apiKey: "AIzaSyBOotJv1Ckz4jSlhulXJiXyD9S1KUFty4s",  // 🔥 改成Android的key
  authDomain: "jz-app-15152.firebaseapp.com",
  databaseURL: "https://jz-app-15152-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jz-app-15152",
  storageBucket: "jz-app-15152.firebasestorage.app",
  messagingSenderId: "131506968513",
  appId: "1:131506968513:android:26df2095fabf0e1dffc140",  // 🔥 用Android的appId
};

const app = initializeApp(firebaseConfig);

// ⚠️ 简单版本：直接使用 getAuth，不在React Native中设置持久化
// Firebase SDK 会自动处理大多数情况
export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;