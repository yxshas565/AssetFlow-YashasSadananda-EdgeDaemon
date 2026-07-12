import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Assets from "./pages/Assets";
import Bookings from "./pages/Bookings";
import OrgSetup from "./pages/OrgSetup";
import Allocations from "./pages/Allocations";
import Maintenance from "./pages/Maintenance";
import Audits from "./pages/Audits";
import { useAuth } from "./context/AuthContext";

function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
        Welcome back, {user?.name?.split(" ")[0]}
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>Here's what's happening across your organization's assets.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/org" element={<OrgSetup />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/audits" element={<Audits />} />
        {/* Assets, Bookings, Allocations, Maintenance, Audits, Org routes added as each page is built */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}