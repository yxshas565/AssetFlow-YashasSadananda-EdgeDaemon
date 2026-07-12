import React, { useState } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import "./Drawer.css";

const STATUS_OPTIONS = ["Available", "Allocated", "Reserved", "UnderMaintenance", "Lost", "Retired", "Disposed"];

export default function AssetDetailDrawer({ assetId, onClose, onChanged }) {
  const { data: asset, loading, refetch } = useApi(`/assets/${assetId}`);
  const { data: history } = useApi(`/assets/${assetId}/history`);
  const { run, loading: changing, error } = useApiMutation();

  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");

  async function handleStatusChange(e) {
    e.preventDefault();
    try {
      await run(`/assets/${assetId}/status`, {
        method: "PATCH",
        body: { status: newStatus, reason: reason || null },
      });
      setNewStatus("");
      setReason("");
      refetch();
      onChanged();
    } catch {
      // error shown below
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel surface fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>{loading ? "Loading…" : asset?.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {!loading && asset && (
          <>
            <div className="drawer-meta-grid">
              <div><span className="meta-label">Tag</span><span>{asset.asset_tag}</span></div>
              <div><span className="meta-label">Status</span><span className="badge badge-neutral">{asset.status}</span></div>
              <div><span className="meta-label">Location</span><span>{asset.location || "—"}</span></div>
              <div><span className="meta-label">Serial</span><span>{asset.serial_number || "—"}</span></div>
              <div><span className="meta-label">Condition</span><span>{asset.condition || "—"}</span></div>
              <div><span className="meta-label">Bookable</span><span>{asset.is_bookable ? "Yes" : "No"}</span></div>
            </div>

            <div className="drawer-section">
              <h3>Change Status</h3>
              {error && <div className="auth-error">{error}</div>}
              <form onSubmit={handleStatusChange} className="drawer-status-form">
                <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
                  <option value="">Select new status</option>
                  {STATUS_OPTIONS.filter((s) => s !== asset.status).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <button className="btn btn-primary" disabled={changing || !newStatus}>
                  {changing ? "Updating…" : "Update Status"}
                </button>
              </form>
            </div>

            <div className="drawer-section">
              <h3>History</h3>
              <div className="timeline">
                {(history || []).map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <span className="timeline-transition">
                        {h.from_status ? `${h.from_status} → ${h.to_status}` : `Registered as ${h.to_status}`}
                      </span>
                      {h.reason && <span className="timeline-reason">{h.reason}</span>}
                    </div>
                  </div>
                ))}
                {(!history || history.length === 0) && <p className="empty-state-inline">No history yet.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}