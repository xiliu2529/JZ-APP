import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

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

export const auth = getAuth(app);
export const database = getDatabase(app, "https://jz-app-15152-default-rtdb.asia-southeast1.firebasedatabase.app");
export default app;
