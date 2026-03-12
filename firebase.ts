import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA-AGz8yMIyEim-25rsVRr3fzNn8qJGHUw",
  authDomain: "jz-app-15152.firebaseapp.com",
  databaseURL: "https://jz-app-15152-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jz-app-15152",
  storageBucket: "jz-app-15152.firebasestorage.app",
  messagingSenderId: "131506968513",
  appId: "1:131506968513:web:64f1904b2e7d097fffc140",
};

const app = initializeApp(firebaseConfig);

// Web 平台用 getAuth，原生平台用 AsyncStorage 持久化
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

export const database =getDatabase(app, "https://jz-app-15152-default-rtdb.asia-southeast1.firebasedatabase.app")
export default app;
