import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

// 用户注册（使用邮箱 + 密码创建新账号）
export const register = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

// 用户登录（使用邮箱 + 密码登录已有账号）
export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

// 用户登出（退出当前登录状态）
export const logout = () => signOut(auth);

// 监听登录状态变化（例如：登录 / 退出时自动触发）
export const onAuthChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
