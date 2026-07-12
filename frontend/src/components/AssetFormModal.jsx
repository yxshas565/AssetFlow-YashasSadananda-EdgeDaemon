import React, { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function AssetFormModal({ categories, onClose, onCreated }) {
  const { run, loading, error } = useApiMutation();
  const [form, setForm] = useState({
    asset_tag: "",
    name: "",
    category_id: "",
    serial_number: "",
    location: "",
    condition: "",
    is_bookable: false,
  });

  function update(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await run("/assets", {
        method: "POST",
        body: {
          ...form,
          category_id: Number(form.category_id),
          serial_number: form.serial_number || null,
          location: form.location || null,
          condition: form.condition || null,
        },
      });
      onCreated();
    } catch {
      // error already captured by useApiMutation, shown below
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Register New Asset</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label className="auth-label">
              Asset Tag *
              <input className="input" value={form.asset_tag} onChange={update("asset_tag")} required maxLength={20} placeholder="e.g. LAP-0042" />
            </label>
            <label className="auth-label">
              Category *
              <select className="input" value={form.category_id} onChange={update("category_id")} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <label className="auth-label">
            Name *
            <input className="input" value={form.name} onChange={update("name")} required maxLength={150} placeholder="e.g. Dell Latitude 5440" />
          </label>

          <div className="form-row">
            <label className="auth-label">
              Serial Number
              <input className="input" value={form.serial_number} onChange={update("serial_number")} maxLength={100} />
            </label>
            <label className="auth-label">
              Location
              <input className="input" value={form.location} onChange={update("location")} maxLength={150} placeholder="e.g. Floor 3, Bay 12" />
            </label>
          </div>

          <label className="auth-label">
            Condition
            <input className="input" value={form.condition} onChange={update("condition")} maxLength={50} placeholder="e.g. New, Good, Fair" />
          </label>

          <label className="checkbox-label">
            <input type="checkbox" checked={form.is_bookable} onChange={update("is_bookable")} />
            This asset can be booked (e.g. meeting rooms, projectors, vehicles)
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Registering…" : "Register Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}