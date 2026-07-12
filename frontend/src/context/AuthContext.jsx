import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, loginRequest, ApiError } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, validate it against /auth/me so a stale
  // or expired token doesn't leave the UI thinking the user is logged in.
  useEffect(() => {
    const token = localStorage.getItem("assetflow_token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("assetflow_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { access_token } = await loginRequest(email, password);
    localStorage.setItem("assetflow_token", access_token);
    const me = await apiFetch("/auth/me");
    setUser(me);
    return me;
  }

  async function signup({ name, email, password, department_id }) {
    await apiFetch("/auth/signup", {
      method: "POST",
      body: { name, email, password, department_id: department_id || null },
    });
    // Signup creates an Employee-role account only (backend rule) — log
    // them in immediately after so they land in the app, not back on a form.
    return login(email, password);
  }

  function logout() {
    localStorage.removeItem("assetflow_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}