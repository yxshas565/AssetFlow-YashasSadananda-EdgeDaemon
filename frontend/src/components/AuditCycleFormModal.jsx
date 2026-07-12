import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function AuditCycleFormModal({ onClose, onCreated }) {
  const [scopeLocation, setScopeLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (endDate < startDate) { setError("End date must be on or after start date."); return; }
    try {
      await run("/audits", {
        method: "POST",
        body: {
          scope_department_id: null,
          scope_location: scopeLocation.trim() || null,
          start_date: startDate,
          end_date: endDate,
        },
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Audit Cycle</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Scope / location (optional)
            <input className="input" placeholder="e.g. Bangalore HQ, Floor 3" value={scopeLocation} onChange={(e) => setScopeLocation(e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Start date
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              End date
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}