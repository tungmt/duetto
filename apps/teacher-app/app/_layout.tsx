import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { getSessionUserId } from "../src/session";

export default function Layout() {
  useEffect(() => {
    getSessionUserId().then((userId) => {
      if (!userId) {
        router.replace("/login");
      }
    });
  }, []);

  return (
    <Stack screenOptions={{ headerTitle: "Duetto Teacher" }}>
      <Stack.Screen name="record-video" options={{ title: "Record Video" }} />
    </Stack>
  );
}
