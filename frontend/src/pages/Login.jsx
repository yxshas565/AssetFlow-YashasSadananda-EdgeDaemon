import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../api/client";
import "./AuthPages.css";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
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

      <div className="auth-layout">
        <div className="auth-pitch fade-in">
          <span className="auth-pitch-badge">Odoo Hackathon 2026</span>
          <h1 className="auth-pitch-title">
            Track every asset, <span className="highlight">never lose a thing.</span>
          </h1>
          <p className="auth-pitch-desc">
            Enterprise asset and resource management — allocations, bookings, maintenance,
            and audits, all in one place with a full lifecycle history for every item you own.
          </p>
          <div className="auth-pitch-features">
            <div className="auth-pitch-feature"><span className="dot" /> Real-time asset allocation & transfers</div>
            <div className="auth-pitch-feature"><span className="dot" /> Conflict-free resource booking</div>
            <div className="auth-pitch-feature"><span className="dot" /> Full audit trail on every asset</div>
          </div>
        </div>

        <div className="auth-card surface fade-in">
          <div className="auth-brand">
            <span className="auth-brand-mark">AF</span>
            <div className="auth-brand-text">
              <span className="auth-brand-name">AssetFlow</span>
              <span className="auth-brand-tagline">Asset & Resource Management</span>
            </div>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to manage your organization's assets</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Email
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@company.com" />
            </label>

            <label className="auth-label">
              <div className="auth-label-row">
                <span>Password</span>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </label>

            <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}