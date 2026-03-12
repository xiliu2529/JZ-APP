import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { User } from "firebase/auth";
import { onAuthChanged } from "./authService";
import { RootStackParamList } from "./types";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Home from "./screens/Home";
import History from "./screens/History";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    记账: "📝",
    历史: "📊",
  };
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
        {icons[label] || "●"}
      </Text>
    </View>
  );
}

function MainTabs({ user }: { user: User }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1A1A1A",
        tabBarInactiveTintColor: "#BBB",
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="记账">
        {() => <Home user={user} />}
      </Tab.Screen>
      <Tab.Screen name="历史">
        {() => <History user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setInitializing(false);
    }, 3000);

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthChanged((u) => {
        clearTimeout(timeout);
        setUser(u);
        setInitializing(false);
      });
    } catch (e: any) {
      clearTimeout(timeout);
      setInitializing(false);
    }

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
        <MainTabs user={user} />
      ) : (
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
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    height: Platform.OS === "ios" ? 82 : 60,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
