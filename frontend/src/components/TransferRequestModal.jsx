import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function TransferRequestModal({ assets, employees, onClose, onCreated }) {
  const [assetId, setAssetId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !toEmployeeId) { setError("Select both an asset and a recipient."); return; }
    try {
      await run("/transfers", {
        method: "POST",
        body: { asset_id: Number(assetId), to_employee_id: Number(toEmployeeId) },
      });
      onCreated();
    } catch (err) {
      // 403 if you don't currently hold the asset, 400 if no active allocation exists
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Transfer</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
          You can only transfer assets currently allocated to you.
        </p>
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
            Transfer to
            <select className="input" value={toEmployeeId} onChange={(e) => setToEmployeeId(e.target.value)} required>
              <option value="">Select employee</option>
              {employees.filter((e) => e.is_active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Requesting..." : "Request Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}