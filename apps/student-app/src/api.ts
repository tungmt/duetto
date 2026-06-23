import { getSessionUserId } from "./session";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.237:4000";

export async function api(path: string, init?: RequestInit) {
  const userId = (await getSessionUserId()) ?? "student-dev-user";
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": userId,
      "x-role": "USER",
      "x-profile-kind": "STUDENT",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
