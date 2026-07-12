import React from "react";

// Pages are wired in incrementally as each screen is built:
// Login, Dashboard, OrgSetup, AssetDirectory, Allocation, Booking,
// Maintenance, Audit, Reports, ActivityLog — see src/pages/

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>AssetFlow</h1>
      <p>Enterprise Asset & Resource Management System — build in progress.</p>
    </div>
  );
}
