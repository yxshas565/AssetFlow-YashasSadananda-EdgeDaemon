import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

const ROLES = ["Employee", "DepartmentHead", "AssetManager", "Admin"];

export default function RolePromoteModal({ employee, onClose, onPromoted }) {
  const [role, setRole] = useState(employee.role);
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await run(`/org/employees/${employee.id}/role`, { method: "PATCH", body: { role } });
      onPromoted();
    } catch (err) {
      // Backend blocks self-promotion — surfaces here if the logged-in admin
      // tries to change their own role
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Role — {employee.name}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Role
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}