"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', padding: '24px', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#4285f4', marginRight: '8px' }}>D</span>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>Duetto Admin</span>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>Sign in with email and password (admin role required)</p>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column' }}>
          {state?.error && <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px' }}>{state.error}</div>}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#555' }}>Email</label>
            <input id="email" name="email" style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }} disabled={pending} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#555' }}>Password</label>
            <input id="password" name="password" style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }} type="password" />
          </div>
          {pending && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: '#666666', fontSize: '14px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(0,0,0,.1)', borderRadius: '50%', borderTopColor: '#4285f4', animation: 'spin 1s ease-in-out infinite', marginRight: '8px' }} />
              Processing your request...
            </div>
          )}
          <button type="submit" style={{ padding: '12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', margin: '16px 0 8px 0' }} disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <a href="/forgot-password" style={{ color: '#4285f4', textDecoration: 'none', fontSize: '14px', marginTop: '8px', display: 'block' }}>
            Forgot password?
          </a>
        </form>
      </div>
    </main>
  );
}
