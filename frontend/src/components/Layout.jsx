import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./Layout.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "◧", end: true },
  { to: "/assets", label: "Assets", icon: "▣" },
  { to: "/bookings", label: "Bookings", icon: "◷" },
  { to: "/allocations", label: "Allocations", icon: "⇄" },
  { to: "/maintenance", label: "Maintenance", icon: "⚙" },
  { to: "/audits", label: "Audits", icon: "✓" },
  { to: "/org", label: "Org Setup", icon: "▤", roles: ["Admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar surface">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">AF</span>
          {!collapsed && <span className="sidebar-brand-name">AssetFlow</span>}
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-collapse-btn" onClick={() => setCollapsed((c) => !c)} type="button">
          {collapsed ? "»" : "« Collapse"}
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar surface">
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="Toggle theme">
              <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            </button>
            <div className="topbar-user">
              <div className="topbar-user-avatar">{user?.name?.[0]?.toUpperCase() || "?"}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name}</span>
                <span className="badge badge-neutral">{user?.role}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        </header>

        <main className="app-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}