import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { getSessionUserId } from "../src/session";

// Import screens from their locations
import LoginScreen from "./login";
import RegisterScreen from "./register";
import VerificationScreen from "./verification";
import ResetPasswordScreen from "./reset-password";
import UpdateProfileScreen from "./update-profile";
import OnboardingScreen from "./onboarding";
import RecordVideoScreen from "./record-video";
import ChallengesScreen from "./dashboard/challenges";
import ClassesScreen from "./dashboard/classes";
import ProfileScreen from "./dashboard/profile";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitle: "Duetto Teacher",
        tabBarLabelPosition: "below-icon",
      }}
    >
      <Tab.Screen 
        name="ChallengesTab" 
        component={ChallengesScreen}
        options={{ 
          title: "Challenges",
          tabBarLabel: "Challenges"
        }}
      />
      <Tab.Screen 
        name="ClassesTab" 
        component={ClassesScreen}
        options={{ 
          title: "Classes",
          tabBarLabel: "Classes"
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ 
          title: "Profile",
          tabBarLabel: "Profile"
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      {/* <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ title: "Welcome" }}
      /> */}
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RecordVideo" 
        component={RecordVideoScreen}
        options={{ title: "Record Video" }}
      />
      <Stack.Screen 
        name="UpdateProfileFromDashboard" 
        component={UpdateProfileScreen}
        options={{ title: "Update Profile" }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<"Auth" | "App" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userId = await getSessionUserId();
        setInitialRoute(userId ? "App" : "Auth");
      } catch (e) {
        setInitialRoute("Auth");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f7" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {initialRoute === "Auth" ? (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthStack}
            options={{ animationEnabled: false }}
          />
        ) : (
          <Stack.Screen 
            name="AppStack" 
            component={AppStack}
            options={{ animationEnabled: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
