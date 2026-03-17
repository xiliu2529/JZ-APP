// firebase.js
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBOotJv1Ckz4jSlhulXJiXyD9S1KUFty4s",
  authDomain: "jz-app-15152.firebaseapp.com",
  databaseURL: "https://jz-app-15152-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jz-app-15152",
  storageBucket: "jz-app-15152.firebasestorage.app",
  messagingSenderId: "131506968513",
  appId: "1:131506968513:android:26df2095fabf0e1dffc140",
};

const app = initializeApp(firebaseConfig);

// ⭐ 关键：使用 AsyncStorage 持久化登录
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const database = getDatabase(app);

export default app;