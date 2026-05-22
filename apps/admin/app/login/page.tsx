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
        <p className="auth-sub">Sign in with your admin email</p>

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
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
