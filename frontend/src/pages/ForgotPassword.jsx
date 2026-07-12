import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { apiFetch, ApiError } from "../api/client";
import "./AuthPages.css";

export default function ForgotPassword() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setResetToken(res.reset_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page fade-in">
      <div className="auth-topbar">
        <div className="auth-topbar-brand">
          <span className="mark">AF</span>
          <span>AssetFlow</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="Toggle theme">
          <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
        </button>
      </div>

      <div className="auth-layout" style={{ gridTemplateColumns: "1fr", justifyItems: "center" }}>
        <div className="auth-card surface fade-in">
          <div className="auth-brand">
            <span className="auth-brand-mark">AF</span>
            <div className="auth-brand-text">
              <span className="auth-brand-name">AssetFlow</span>
              <span className="auth-brand-tagline">Asset & Resource Management</span>
            </div>
          </div>
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">
            Enter your account email. In production this would email you a reset link —
            for this demo, the token is shown directly below.
          </p>

          {error && <div className="auth-error">{error}</div>}

          {!resetToken ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Email
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@company.com" />
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
          ) : (
            <>
              <div className="auth-success">
                If an account exists for that email, a reset token was generated. It expires in 30 minutes.
              </div>
              <span className="reset-token-label">Demo reset token (normally emailed)</span>
              <div className="reset-token-box">{resetToken}</div>
              <Link to={`/reset-password?token=${resetToken}`} className="btn btn-primary auth-submit" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Continue to reset →
              </Link>
            </>
          )}

          <p className="auth-footer">
            Remembered it? <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}