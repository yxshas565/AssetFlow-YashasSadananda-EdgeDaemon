import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function DepartmentFormModal({ departments, employees, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [headId, setHeadId] = useState("");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Department name is required."); return; }
    try {
      await run("/org/departments", {
        method: "POST",
        body: {
          name: name.trim(),
          parent_department_id: parentId ? Number(parentId) : null,
          head_employee_id: headId ? Number(headId) : null,
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
          <h2>New Department</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Parent department (optional)
            <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None</option>
              {departments.filter(d => d.is_active).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label>
            Head of department (optional)
            <select className="input" value={headId} onChange={(e) => setHeadId(e.target.value)}>
              <option value="">None</option>
              {employees.filter(e => e.is_active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}