import React, { useEffect, useState } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { isReadyRef, navigationRef } from "./src/actions/navigation";
import { getSessionUserId } from "./src/actions/session";
import colors from "./src/configs/colors";
import FloatingTabBar from "./src/components/FloatingTabBar";

// Import screens from their locations
import LoginScreen from "./src/app/login";
import RegisterScreen from "./src/app/register";
import VerificationScreen from "./src/app/verification";
import ResetPasswordScreen from "./src/app/reset-password";
import UpdateProfileScreen from "./src/app/update-profile";
import RecordVideoScreen from "./src/app/record-video";
import ChallengesScreen from "./src/app/dashboard/challenges";
import ClassesScreen from "./src/app/dashboard/classes";
import ProfileScreen from "./src/app/dashboard/profile";
import UpdatePasswordScreen from "./src/app/dashboard/update-password";
import ClassDetailScreen from "./src/app/dashboard/class-detail";
import StudentDetailScreen from "./src/app/dashboard/student-detail";
import CreateStudentScreen from "./src/app/dashboard/create-student";
import CreateClassScreen from "./src/app/dashboard/create-class";
import ChallengeDetailScreen from "./src/app/dashboard/challenge-detail";
import SubmissionReviewScreen from "./src/app/dashboard/submission-review";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  ChallengesTab: { active: "videocam" as const, inactive: "videocam-outline" as const, label: "Challenges" },
  ClassesTab: { active: "people" as const, inactive: "people-outline" as const, label: "Classes" },
  ProfileTab: { active: "person" as const, inactive: "person-outline" as const, label: "Profile" }
};

function DashboardTabs() {
  const navigation = useNavigation<any>();

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          icons={TAB_ICONS}
          centerAction={{ icon: "add", onPress: () => navigation.navigate("RecordVideo") }}
        />
      )}
      screenOptions={{
        headerShown: false
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" }}>
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
