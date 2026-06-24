import { getSessionUserId } from "./session";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.237:4000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function api(path: string, init?: RequestInit) {
  const userId = (await getSessionUserId()) ?? "teacher-dev-user";
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: HeadersInit = {
    "x-user-id": userId,
    "x-role": "USER",
    "x-profile-kind": "TEACHER",
    ...init?.headers
  };

  if (!isFormData && !(init?.headers && "content-type" in (init.headers as Record<string, string>))) {
    (headers as Record<string, string>)["content-type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const raw = await response.text();
    let parsed: unknown = raw;
    let message = raw;

    try {
      const json = JSON.parse(raw) as { error?: string; message?: string };
      parsed = json;
      message = json.error || json.message || raw;
    } catch {
      // keep raw text
    }

    throw new ApiError(message, response.status, parsed);
  }

  return response.json();
}
