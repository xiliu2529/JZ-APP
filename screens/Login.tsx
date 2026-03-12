import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login } from '../authService';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function Login({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const code = e?.code || '';
      const msg =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? '邮箱或密码错误'
          : code === 'auth/user-not-found'
          ? '用户不存在'
          : code === 'auth/network-request-failed'
          ? '网络连接失败，请检查网络'
          : code === 'auth/too-many-requests'
          ? '尝试次数过多，请稍后再试'
          : `登录失败：${code || e?.message || '未知错误'}`;
      Alert.alert('登录失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo 区域 */}
        <View style={styles.logoArea}>
          <Text style={styles.logoSymbol}>¥</Text>
          <Text style={styles.appName}>记账</Text>
          <Text style={styles.tagline}>简单 · 清晰 · 高效</Text>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入邮箱"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入密码"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>登 录</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              还没有账户？<Text style={styles.linkHighlight}>立即注册</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoSymbol: {
    fontSize: 48,
    fontWeight: '200',
    color: '#1A1A1A',
    letterSpacing: -2,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 4,
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    letterSpacing: 2,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#888',
    letterSpacing: 1,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  btn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 3,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#999',
  },
  linkHighlight: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
});
