import { useState, useMemo } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import MaintenanceRequestModal from "../components/MaintenanceRequestModal";
import TechnicianAssignModal from "../components/TechnicianAssignModal";
import "../pages/OrgSetup.css";
import "./Maintenance.css";

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "TechnicianAssigned", "InProgress", "Resolved"];

// Mirrors backend's _require_status state machine so invalid actions never appear as options
const NEXT_ACTIONS = {
  Pending: ["approve", "reject"],
  Approved: ["assign-technician"],
  TechnicianAssigned: ["start"],
  InProgress: ["resolve"],
  Rejected: [],
  Resolved: [],
};

export default function Maintenance() {
  const [statusFilter, setStatusFilter] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [banner, setBanner] = useState(null);

  const { data: assetsData } = useApi("/assets?limit=200");
  const assets = assetsData?.items ?? [];

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status_filter", statusFilter);
    p.set("limit", "50");
    return p.toString();
  }, [statusFilter]);

  const { data, loading, refetch } = useApi(`/maintenance?${query}`);
  const requests = data?.items ?? [];

  const { run: approve } = useApiMutation();
  const { run: reject } = useApiMutation();
  const { run: start } = useApiMutation();
  const { run: resolve } = useApiMutation();

  const assetLabel = (id) => {
    const a = assets.find((x) => x.id === id);
    return a ? `${a.name} (${a.asset_tag})` : `Asset #${id}`;
  };

  const runAction = async (fn, path, successMsg) => {
    try {
      await fn(path, { method: "PATCH" });
      setBanner({ type: "success", text: successMsg });
      refetch();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const priorityBadge = (p) => {
    const map = { Low: "badge-neutral", Medium: "badge-warning", High: "badge-danger", Critical: "badge-danger" };
    return map[p] ?? "badge-neutral";
  };

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <div>
          <h1>Maintenance</h1>
          <p className="page-subtitle">Pending → Approved → Technician Assigned → In Progress → Resolved.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>+ New Request</button>
      </div>

      {banner && (
        <div className={`banner banner-${banner.type}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      <div className="surface bookings-filters">
        <div className="filter-group">
          <label>Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="muted">Loading...</p>}

      <div className="surface orgsetup-panel">
        <table className="orgsetup-table">
          <thead>
            <tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Technician</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const actions = NEXT_ACTIONS[r.status] ?? [];
              return (
                <tr key={r.id}>
                  <td>{assetLabel(r.asset_id)}</td>
                  <td style={{ maxWidth: 280 }}>{r.issue_description}</td>
                  <td><span className={`badge ${priorityBadge(r.priority)}`}>{r.priority}</span></td>
                  <td>{r.technician_name ?? "—"}</td>
                  <td><span className="badge badge-neutral">{r.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {actions.includes("approve") && (
                        <button className="btn btn-primary" onClick={() => runAction(approve, `/maintenance/${r.id}/approve`, "Request approved.")} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Approve</button>
                      )}
                      {actions.includes("reject") && (
                        <button className="btn btn-danger" onClick={() => runAction(reject, `/maintenance/${r.id}/reject`, "Request rejected.")} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Reject</button>
                      )}
                      {actions.includes("assign-technician") && (
                        <button className="btn btn-primary" onClick={() => setAssignTarget(r)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Assign Technician</button>
                      )}
                      {actions.includes("start") && (
                        <button className="btn btn-primary" onClick={() => runAction(start, `/maintenance/${r.id}/start`, "Work started.")} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Start Work</button>
                      )}
                      {actions.includes("resolve") && (
                        <button className="btn btn-primary" onClick={() => runAction(resolve, `/maintenance/${r.id}/resolve`, "Marked resolved.")} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Resolve</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && !loading && <tr><td colSpan={6} className="muted">No maintenance requests.</td></tr>}
          </tbody>
        </table>
      </div>

      {showRequestModal && (
        <MaintenanceRequestModal
          assets={assets}
          onClose={() => setShowRequestModal(false)}
          onCreated={() => { setShowRequestModal(false); refetch(); setBanner({ type: "success", text: "Request raised." }); }}
        />
      )}

      {assignTarget && (
        <TechnicianAssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); refetch(); setBanner({ type: "success", text: "Technician assigned." }); }}
        />
      )}
    </div>
  );
}