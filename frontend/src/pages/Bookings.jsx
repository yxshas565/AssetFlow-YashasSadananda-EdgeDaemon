import { useState, useMemo } from "react";
import { useApi, useApiMutation } from "../api/useApi";
// import { apiClient } from "../api/client";
import BookingFormModal from "../components/BookingFormModal";
import BookingTimeline from "../components/BookingTimeline";
import "./Bookings.css";

const STATUS_OPTIONS = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(0);
  const [banner, setBanner] = useState(null); // { type: 'success'|'error', text }
  const limit = 20;

  // Bookable assets populate the resource picker (both filter dropdown and form)
  const { data: assetsData } = useApi("/assets?is_bookable=true&limit=200");
  const bookableAssets = assetsData?.items ?? [];

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status_filter", statusFilter);
    if (resourceFilter) params.set("resource_id", resourceFilter);
    params.set("limit", limit);
    params.set("offset", page * limit);
    return params.toString();
  }, [statusFilter, resourceFilter, page]);

  const { data, loading, error, refetch } = useApi(`/bookings?${queryString}`);
  const { run: cancelBooking } = useApiMutation();

  const bookings = data?.items ?? [];
  const total = data?.total ?? 0;

  const assetName = (id) =>
    bookableAssets.find((a) => a.id === id)?.name ?? `Asset #${id}`;

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(`/bookings/${id}/cancel`, { method: "PATCH" });
      setBanner({ type: "success", text: "Booking cancelled." });
      refetch();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <div className="bookings-page">
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          <p className="page-subtitle">Reserve bookable assets — overlaps are rejected at the database level.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Booking
        </button>
      </div>

      {banner && (
        <div className={`banner banner-${banner.type}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      <div className="surface bookings-filters">
  <div className="filter-group">
    <label>Resource</label>
    <select value={resourceFilter} onChange={(e) => { setResourceFilter(e.target.value); setPage(0); }} className="input">
      <option value="">All resources</option>
      {bookableAssets.map((a) => (
        <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
      ))}
    </select>
  </div>
  <div className="filter-group">
    <label>Status</label>
    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="input">
      <option value="">All statuses</option>
      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  </div>
</div>

      {/* Timeline only makes sense once a specific resource is selected */}
      {resourceFilter && (
        <BookingTimeline
          resourceId={Number(resourceFilter)}
          resourceName={assetName(Number(resourceFilter))}
        />
      )}

      {loading && <p className="muted">Loading bookings...</p>}
      {error && <p className="error-text">{error.message}</p>}

      {!loading && !error && (
        <div className="surface bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr><td colSpan={5} className="muted">No bookings found.</td></tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{assetName(b.resource_id)}</td>
                  <td>{new Date(b.start_ts).toLocaleString()}</td>
                  <td>{new Date(b.end_ts).toLocaleString()}</td>
                  <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                  <td>
                    {(b.status === "UPCOMING" || b.status === "ONGOING") && (
                      <button className="btn btn-secondary" onClick={() => handleCancel(b.id)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="muted">{page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}</span>
            <button className="btn btn-secondary" disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {showModal && (
        <BookingFormModal
          bookableAssets={bookableAssets}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refetch(); setBanner({ type: "success", text: "Booking created." }); }}
        />
      )}
    </div>
  );
}