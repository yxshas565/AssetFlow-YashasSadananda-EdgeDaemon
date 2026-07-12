import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function CategoryFormModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const { run, loading } = useApiMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Category name is required."); return; }
    try {
      await run("/org/categories", { method: "POST", body: { name: name.trim() } });
      onCreated();
    } catch (err) {
      // 409 = duplicate name, backend enforces uniqueness
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Category</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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