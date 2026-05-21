import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerTitle: "Duetto Teacher" }}>
      <Stack.Screen name="record-video" options={{ title: "Record Video" }} />
    </Stack>
  );
}
