"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_COOKIE = "admin_session";

export type AdminSession = {
  userId: string;
  role: "ADMIN" | "MODERATOR";
  roles: Array<"ADMIN" | "MODERATOR" | "USER">;
  name: string;
  email: string;
};

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function adminFetch(path: string, session: AdminSession, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": session.userId,
      "x-role": session.role,
      "x-roles": JSON.stringify(session.roles),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email) return { error: "Email is required" };
  if (!password) return { error: "Password is required" };

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "Login failed" };
  }

  const data = await res.json();
  const user = data.user;

  const roles = Array.isArray(user?.roles)
    ? (user.roles.filter((r: unknown) => r === "ADMIN" || r === "MODERATOR" || r === "USER") as Array<"ADMIN" | "MODERATOR" | "USER">)
    : [];

  const hasAdminAccess = user?.role === "ADMIN" || user?.role === "MODERATOR" || roles.includes("ADMIN") || roles.includes("MODERATOR");

  if (!user || !hasAdminAccess) {
    return { error: "Access denied. Admin or moderator account required." };
  }

  const primaryRole: "ADMIN" | "MODERATOR" =
    user.role === "ADMIN" || roles.includes("ADMIN") ? "ADMIN" : "MODERATOR";

  const session: AdminSession = {
    userId: user.id,
    role: primaryRole,
    roles: Array.from(new Set(["USER", ...roles, primaryRole])) as Array<"ADMIN" | "MODERATOR" | "USER">,
    name: user.name,
    email: user.email
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email) return { error: "Email is required" };

  try {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      // Don't reveal if email exists or not
      return { ok: true, message: "If the email exists, a reset code has been sent." };
    }

    return { ok: true, message: "Reset code sent to your email." };
  } catch (error) {
    // Even on error, don't reveal anything
    return { ok: true, message: "If the email exists, a reset code has been sent." };
  }
}

export async function verifyResetPasswordAction(_prev: unknown, formData: FormData) {
  const email = formData.get("email")?.toString().trim() ?? "";
  const code = formData.get("code")?.toString().trim() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!email) return { error: "Email is required" };
  if (!code) return { error: "Reset code is required" };
  if (!newPassword) return { error: "New password is required" };
  if (!confirmPassword) return { error: "Password confirmation is required" };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match" };
  if (newPassword.length < 6) return { error: "Password must be at least 6 characters" };

  try {
    const res = await fetch(`${API_URL}/api/auth/verify-reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code, newPassword })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error ?? "Password reset failed. Please try again." };
    }

    return { ok: true, message: "Password reset successful!" };
  } catch (error) {
    return { error: "An error occurred. Please try again." };
  }
}

