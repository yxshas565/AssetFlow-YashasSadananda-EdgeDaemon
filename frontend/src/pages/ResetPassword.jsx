import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { apiFetch, ApiError } from "../api/client";
import { scorePassword } from "../utils/passwordStrength";
import "./AuthPages.css";

export default function ResetPassword() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(newPassword), [newPassword]);
  const barColor = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--success)", "var(--success)"][strength.score];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (strength.score < 4) {
      setError("Please choose a stronger password — meet at least 4 of the 5 requirements below.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, new_password: newPassword },
      });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed. Please try again.");
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
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-subtitle">Paste your reset token if it wasn't pre-filled, then choose a new password.</p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">Password reset — redirecting you to sign in…</div>}

          {!success && (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Reset token
                <input type="text" className="input" value={token} onChange={(e) => setToken(e.target.value)} required placeholder="Paste your reset token" />
              </label>

              <label className="auth-label">
                New password
                <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Create a strong password" />
              </label>

              {newPassword.length > 0 && (
                <div className="pw-strength">
                  <div className="pw-strength-bar">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="pw-strength-segment" style={{ background: i < strength.score ? barColor : undefined }} />
                    ))}
                  </div>
                  <div className="pw-strength-label" style={{ color: barColor }}>{strength.label}</div>
                  <div className="pw-checklist">
                    <span className={`pw-check ${strength.checks.length ? "met" : ""}`}>8+ characters</span>
                    <span className={`pw-check ${strength.checks.upper ? "met" : ""}`}>Uppercase</span>
                    <span className={`pw-check ${strength.checks.lower ? "met" : ""}`}>Lowercase</span>
                    <span className={`pw-check ${strength.checks.number ? "met" : ""}`}>Number</span>
                    <span className={`pw-check ${strength.checks.special ? "met" : ""}`}>Special character</span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
                {submitting ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}

          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}