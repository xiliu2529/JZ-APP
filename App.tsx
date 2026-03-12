import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { User } from "firebase/auth";
import { onAuthChanged } from "./authService";
import { RootStackParamList } from "./types";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Home from "./screens/Home";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 超时保护：若 Firebase 未正确配置，3 秒后强制结束 loading
    const timeout = setTimeout(() => setInitializing(false), 3000);
    const unsubscribe = onAuthChanged((u) => {
      clearTimeout(timeout);
      setUser(u);
      setInitializing(false);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        // 已登录 → 主界面
        <Home user={user} />
      ) : (
        // 未登录 → 登录/注册导航
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
  },
});
