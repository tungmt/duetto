"use client";

import Link from "next/link";
import { resetPasswordAction, verifyResetPasswordAction } from "../actions";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestError("");
    setRequestLoading(true);

    const formData = new FormData();
    formData.set("email", email);

    try {
      const result = await resetPasswordAction(null, formData);
      if (result?.ok) {
        setStep("verify");
      } else {
        setRequestError(result?.error || "Failed to send reset code");
      }
    } catch (error) {
      setRequestError("An error occurred. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("email", email);

    try {
      const result = await verifyResetPasswordAction(null, formData);
      if (result?.ok) {
        // Redirect to login
        window.location.href = "/login?reset=success";
      } else {
        setVerifyError(result?.error || "Password reset failed");
      }
    } catch (error) {
      setVerifyError("An error occurred. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <main className="auth-root">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-mark">D</span>
          <span className="auth-title">Duetto Admin</span>
        </div>
        
        {step === "request" ? (
          <>
            <p className="auth-sub">Enter your email address to receive a password reset code</p>
            <form onSubmit={handleRequestSubmit} className="auth-form">
              {requestError && <div className="alert-error">{requestError}</div>}
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
              <button type="submit" className="btn-primary" disabled={requestLoading}>
                {requestLoading ? "Sending…" : "Send Reset Code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-sub">Enter the code from your email and your new password</p>
            <form onSubmit={handleVerifySubmit} className="auth-form">
              {verifyError && <div className="alert-error">{verifyError}</div>}
              <label className="field-label" htmlFor="code">Reset Code</label>
              <input
                id="code"
                name="code"
                type="text"
                required
                placeholder="000000"
                className="field-input"
              />
              <label className="field-label" htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                placeholder="Enter new password"
                className="field-input"
              />
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm new password"
                className="field-input"
              />
              <button type="submit" className="btn-primary" disabled={verifyLoading}>
                {verifyLoading ? "Resetting…" : "Reset Password"}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setStep("request")}
                style={{ marginTop: "8px", backgroundColor: "#e2e8f0", color: "#0f172a" }}
              >
                Back to email entry
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <Link href="/login" className="field-link">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

