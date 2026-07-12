import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function AllocateAssetModal({ assets, employees, onClose, onCreated }) {
  const [assetId, setAssetId] = useState("");
  const [targetType, setTargetType] = useState("employee"); // employee | department
  const [employeeId, setEmployeeId] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) { setError("Select an asset."); return; }
    if (targetType === "employee" && !employeeId) { setError("Select an employee."); return; }

    try {
      await run("/allocations", {
        method: "POST",
        body: {
          asset_id: Number(assetId),
          employee_id: targetType === "employee" ? Number(employeeId) : null,
          department_id: null, // department allocation deferred — no department picker wired yet
          expected_return_date: expectedReturn || null,
          condition_notes: notes || null,
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
          <h2>Allocate Asset</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Asset
            <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              <option value="">Select an available asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </label>
          <label>
            Employee
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Select an employee</option>
              {employees.filter((e) => e.is_active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label>
            Expected return date (optional)
            <input type="date" className="input" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
          </label>
          <label>
            Condition notes (optional)
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Allocating..." : "Allocate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}