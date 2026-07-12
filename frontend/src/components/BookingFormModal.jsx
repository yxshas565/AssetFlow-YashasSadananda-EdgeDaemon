import { useState } from "react";
import { useApiMutation } from "../api/useApi";
import "./Modal.css";

export default function BookingFormModal({ bookableAssets, onClose, onCreated }) {
  const [resourceId, setResourceId] = useState("");
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");
  const [error, setError] = useState(null);
  const { mutate, loading } = useApiMutation();

  const validate = () => {
    if (!resourceId) return "Select a resource.";
    if (!startTs || !endTs) return "Start and end time are required.";
    if (new Date(endTs) <= new Date(startTs)) return "End time must be after start time.";
    if (new Date(startTs) < new Date()) return "Start time cannot be in the past.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    try {
      await mutate("/bookings", "POST", {
        resource_id: Number(resourceId),
        // datetime-local input has no timezone; new Date().toISOString() converts
        // to UTC using the browser's local offset, matching backend's TIMESTAMPTZ column
        start_ts: new Date(startTs).toISOString(),
        end_ts: new Date(endTs).toISOString(),
      });
      onCreated();
    } catch (err) {
      // 409 = EXCLUDE constraint fired at the DB level — this is the headline feature
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
  <div className="modal-header">
    <h2>New Booking</h2>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
  </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Resource
            <select className="input" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
              <option value="">Select a bookable asset</option>
              {bookableAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input type="datetime-local" className="input" value={startTs} onChange={(e) => setStartTs(e.target.value)} required />
          </label>
          <label>
            End
            <input type="datetime-local" className="input" value={endTs} onChange={(e) => setEndTs(e.target.value)} required />
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
  <button type="submit" className="btn btn-primary" disabled={loading}>
    {loading ? "Booking..." : "Book"}
  </button>
</div>
        </form>
      </div>
    </div>
  );
}