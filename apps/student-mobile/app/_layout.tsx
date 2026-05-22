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

  return <Stack screenOptions={{ headerTitle: "Duetto Student" }} />;
}
