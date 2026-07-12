import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

const STATUSES = ["Available", "Allocated", "Reserved", "UnderMaintenance", "Lost", "Retired", "Disposed"];

export default function AuditFindingModal({ cycleId, assets, onClose, onCreated }) {
  const [assetId, setAssetId] = useState("");
  const [observedStatus, setObservedStatus] = useState("Available");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) { setError("Select an asset."); return; }
    try {
      await run(`/audits/${cycleId}/findings`, {
        method: "POST",
        body: { asset_id: Number(assetId), observed_status: observedStatus },
      });
      onCreated();
    } catch (err) {
      // 403 if not an assigned auditor/admin for this cycle
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Record Finding</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Asset
            <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag}) — system says {a.status}</option>
              ))}
            </select>
          </label>
          <label>
            Observed status (what you physically found)
            <select className="input" value={observedStatus} onChange={(e) => setObservedStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Recording..." : "Record Finding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}