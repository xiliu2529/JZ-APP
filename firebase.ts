import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// ⚠️ 请将以下配置替换为你的 Firebase 项目配置
// 前往 https://console.firebase.google.com → 项目设置 → 你的应用 → 复制 firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyA-AGz8yMIyEim-25rsVRr3fzNn8qJGHUw",
  authDomain: "jz-app-15152.firebaseapp.com",
  projectId: "jz-app-15152",
  storageBucket: "jz-app-15152.firebasestorage.app",
  messagingSenderId: "131506968513",
  appId: "1:131506968513:web:64f1904b2e7d097fffc140",
  measurementId: "G-F99R4D1QEJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
