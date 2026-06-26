import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isReadyRef, navigationRef } from "../src/navigation";
import { getSessionUserId } from "../src/session";

// Import screens from their locations
import LoginScreen from "./login";
import RegisterScreen from "./register";
import VerificationScreen from "./verification";
import ResetPasswordScreen from "./reset-password";
import UpdateProfileScreen from "./update-profile";
import RecordVideoScreen from "./record-video";
import ChallengesScreen from "./dashboard/challenges";
import ClassesScreen from "./dashboard/classes";
import ProfileScreen from "./dashboard/profile";
import UpdatePasswordScreen from "./dashboard/update-password";
import ClassDetailScreen from "./dashboard/class-detail";
import StudentDetailScreen from "./dashboard/student-detail";
import CreateStudentScreen from "./dashboard/create-student";
import CreateClassScreen from "./dashboard/create-class";
import ChallengeDetailScreen from "./dashboard/challenge-detail";
import SubmissionReviewScreen from "./dashboard/submission-review";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: "#0369a1",
        tabBarInactiveTintColor: "#64748b",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";

          if (route.name === "ChallengesTab") {
            iconName = focused ? "videocam" : "videocam-outline";
          } else if (route.name === "ClassesTab") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      <Stack.Screen 
        name="UpdatePassword" 
        component={UpdatePasswordScreen}
        options={{ title: "Change Password" }}
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={{ title: "Class Detail" }}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={{ title: "Student Detail" }}
      />
      <Stack.Screen
        name="CreateStudent"
        component={CreateStudentScreen}
        options={{ title: "Create Student" }}
      />
      <Stack.Screen
        name="CreateClass"
        component={CreateClassScreen}
        options={{ title: "Create Class" }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubmissionReview"
        component={SubmissionReviewScreen}
        options={{ title: "Submission Review" }}
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#eef3f8" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        isReadyRef.current = true;
      }}
      onStateChange={() => {
        isReadyRef.current = true;
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute === "Auth" ? "AuthStack" : "AppStack"}
      >
        <Stack.Screen
          name="AuthStack"
          component={AuthStack}
          options={{ animation: "none" }}
        />
        <Stack.Screen
          name="AppStack"
          component={AppStack}
          options={{ animation: "none" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
