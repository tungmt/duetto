"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="auth-root">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-mark">D</span>
          <span className="auth-title">Duetto Admin</span>
        </div>
        <p className="auth-sub">Sign in with email and password (admin role required)</p>

        <form action={formAction} className="auth-form">
          {state?.error && <div className="alert-error">{state.error}</div>}
          <label className="field-label" htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@example.com"
            className="field-input"
          />
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter password"
            className="field-input"
          />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <a href="/forgot-password" className="field-link" style={{ marginTop: "12px", textAlign: "center", display: "block" }}>
            Forgot password?
          </a>
        </form>
      </div>
    </main>
  );
}
