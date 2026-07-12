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
import { Link } from "react-router-dom";
import { useApi } from "./api/useApi";
import { useAuth } from "./context/AuthContext";

function Dashboard() {
  const { user } = useAuth();
  const { data: assetsData } = useApi("/assets?limit=1");
  const { data: bookingsData } = useApi("/bookings?status_filter=Upcoming&limit=5");
  const { data: maintenanceData } = useApi("/maintenance?status_filter=Pending&limit=5");
  const { data: allAssets } = useApi("/assets?limit=200");

  const totalAssets = assetsData?.total ?? 0;
  const upcomingBookings = bookingsData?.items ?? [];
  const pendingMaintenance = maintenanceData?.items ?? [];
  const assets = allAssets?.items ?? [];

  const statusCounts = assets.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const STAT_CARDS = [
    { label: "Total Assets", value: totalAssets, icon: "▣", color: "var(--accent)" },
    { label: "Available", value: statusCounts.Available ?? 0, icon: "✓", color: "#22c55e" },
    { label: "Allocated", value: statusCounts.Allocated ?? 0, icon: "⇄", color: "#a855f7" },
    { label: "Under Maintenance", value: statusCounts.UnderMaintenance ?? 0, icon: "⚙", color: "#fbbf24" },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header fade-in">
        <h1>Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="page-subtitle">Here's what's happening across your organization's assets.</p>
      </div>

      <div className="dashboard-stats">
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="surface stat-card fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="stat-icon" style={{ background: `${s.color}22`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="surface dashboard-panel fade-in">
          <div className="dashboard-panel-header">
            <h3>Upcoming Bookings</h3>
            <Link to="/bookings" className="dashboard-panel-link">View all →</Link>
          </div>
          {upcomingBookings.length === 0 && <p className="muted">No upcoming bookings.</p>}
          {upcomingBookings.map((b) => (
            <div key={b.id} className="dashboard-list-item">
              <span className="badge badge-upcoming">Upcoming</span>
              <span>Resource #{b.resource_id}</span>
              <span className="muted">{new Date(b.start_ts).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="surface dashboard-panel fade-in">
          <div className="dashboard-panel-header">
            <h3>Pending Maintenance</h3>
            <Link to="/maintenance" className="dashboard-panel-link">View all →</Link>
          </div>
          {pendingMaintenance.length === 0 && <p className="muted">No pending requests.</p>}
          {pendingMaintenance.map((m) => (
            <div key={m.id} className="dashboard-list-item">
              <span className="badge badge-warning">{m.priority}</span>
              <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.issue_description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-quicklinks fade-in">
        <Link to="/assets" className="surface quicklink-card">
          <span className="quicklink-icon">▣</span>
          <span>Assets</span>
        </Link>
        <Link to="/bookings" className="surface quicklink-card">
          <span className="quicklink-icon">◷</span>
          <span>Bookings</span>
        </Link>
        <Link to="/allocations" className="surface quicklink-card">
          <span className="quicklink-icon">⇄</span>
          <span>Allocations</span>
        </Link>
        <Link to="/maintenance" className="surface quicklink-card">
          <span className="quicklink-icon">⚙</span>
          <span>Maintenance</span>
        </Link>
      </div>
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