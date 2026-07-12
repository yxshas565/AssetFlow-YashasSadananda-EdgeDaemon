import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../api/client";
import { scorePassword } from "../utils/passwordStrength";
import "./AuthPages.css";

export default function Signup() {
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (strength.score < 4) {
      setError("Please choose a stronger password — meet at least 4 of the 5 requirements below.");
      return;
    }

    setSubmitting(true);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const barColor = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--success)", "var(--success)"][strength.score];

  return (
    <div className="auth-page fade-in">
      <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="Toggle theme">
        <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
      </button>

      <div className="auth-card surface fade-in">
        <div className="auth-brand">
          <span className="auth-brand-mark">AF</span>
          <span className="auth-brand-name">AssetFlow</span>
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Accounts start with Employee access — admins can promote roles later</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Full name
            <input type="text" className="input" value={form.name} onChange={update("name")} required autoFocus placeholder="Jane Doe" />
          </label>

          <label className="auth-label">
            Email
            <input type="email" className="input" value={form.email} onChange={update("email")} required placeholder="you@company.com" />
          </label>

          <label className="auth-label">
            Password
            <input type="password" className="input" value={form.password} onChange={update("password")} required placeholder="Create a strong password" />
          </label>

          {form.password.length > 0 && (
            <div className="pw-strength">
              <div className="pw-strength-bar">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="pw-strength-segment"
                    style={{ background: i < strength.score ? barColor : undefined }}
                  />
                ))}
              </div>
              <div className="pw-strength-label" style={{ color: barColor }}>
                {strength.label}
              </div>
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
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}