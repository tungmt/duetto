const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": "teacher-dev-user",
      "x-role": "USER",
      "x-profile-kind": "TEACHER",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
