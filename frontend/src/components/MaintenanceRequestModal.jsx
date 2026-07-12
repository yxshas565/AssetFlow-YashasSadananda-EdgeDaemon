import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function MaintenanceRequestModal({ assets, onClose, onCreated }) {
  const [assetId, setAssetId] = useState("");
  const [issue, setIssue] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) { setError("Select an asset."); return; }
    if (!issue.trim()) { setError("Describe the issue."); return; }
    try {
      await run("/maintenance", {
        method: "POST",
        body: { asset_id: Number(assetId), issue_description: issue.trim(), priority },
      });
      onCreated();
    } catch (err) {
      // 400 if asset is Retired/Disposed — backend blocks maintenance on dead assets
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Raise Maintenance Request</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Asset
            <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </label>
          <label>
            Issue description
            <textarea className="input" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} required />
          </label>
          <label>
            Priority
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}