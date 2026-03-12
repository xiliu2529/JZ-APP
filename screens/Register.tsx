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
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register } from '../authService';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function Register({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirm.trim()) {
      Alert.alert('提示', '请填写所有字段');
      return;
    }
    if (password !== confirm) {
      Alert.alert('提示', '两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码长度至少6位');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
    } catch (e: any) {
      const msg =
        e.code === 'auth/email-already-in-use'
          ? '该邮箱已被注册'
          : e.code === 'auth/invalid-email'
          ? '邮箱格式不正确'
          : '注册失败，请重试';
      Alert.alert('注册失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* 顶部返回 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>

        {/* 标题 */}
        <View style={styles.titleArea}>
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>开始你的记账之旅</Text>
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
              placeholder="至少6位"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>确认密码</Text>
            <TextInput
              style={styles.input}
              placeholder="再次输入密码"
              placeholderTextColor="#aaa"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>注 册</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 32,
  },
  backText: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 1,
  },
  titleArea: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    letterSpacing: 1,
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
});
