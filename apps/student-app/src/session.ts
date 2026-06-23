import * as SecureStore from "expo-secure-store";

const USER_ID_KEY = "session_user_id";

export async function getSessionUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function saveSession(userId: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_ID_KEY);
}
