import React, { useState } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import AssetFormModal from "../components/AssetFormModal";
import AssetDetailDrawer from "../components/AssetDetailDrawer";
import "./Assets.css";

const STATUS_OPTIONS = ["Available", "Allocated", "Reserved", "UnderMaintenance", "Lost", "Retired", "Disposed"];

const STATUS_BADGE_CLASS = {
  Available: "badge-success",
  Allocated: "badge-neutral",
  Reserved: "badge-warning",
  UnderMaintenance: "badge-warning",
  Lost: "badge-danger",
  Retired: "badge-danger",
  Disposed: "badge-danger",
};

export default function Assets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const limit = 12;

  const { data, loading, error, refetch } = useApi("/assets", {
    params: { search: search || undefined, status_filter: statusFilter || undefined, limit, offset: page * limit },
    deps: [search, statusFilter, page],
  });

  const categories = useApi("/org/categories", { params: { limit: 100 } });

  function handleCreated() {
    setShowCreate(false);
    refetch();
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="assets-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-subtitle">{data ? `${data.total} total assets` : "Loading…"}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Register Asset
        </button>
      </div>

      <div className="assets-toolbar surface">
        <input
          className="input"
          placeholder="Search by name, tag, or serial number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select
          className="input assets-status-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading && (
        <div className="assets-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="asset-card surface skeleton" style={{ height: 140 }} />
          ))}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="empty-state surface">No assets match your filters.</div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="assets-grid">
            {data.items.map((asset) => (
              <button
                key={asset.id}
                className="asset-card surface fade-in"
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <div className="asset-card-top">
                  <span className="asset-tag">{asset.asset_tag}</span>
                  <span className={`badge ${STATUS_BADGE_CLASS[asset.status] || "badge-neutral"}`}>
                    {asset.status}
                  </span>
                </div>
                <h3 className="asset-name">{asset.name}</h3>
                <div className="asset-meta">
                  {asset.location && <span>📍 {asset.location}</span>}
                  {asset.is_bookable && <span className="badge badge-neutral">Bookable</span>}
                </div>
              </button>
            ))}
          </div>

          <div className="pagination">
            <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </button>
            <span className="pagination-label">Page {page + 1} of {totalPages}</span>
            <button className="btn btn-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </>
      )}

      {showCreate && (
        <AssetFormModal
          categories={categories.data?.items || []}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {selectedAssetId && (
        <AssetDetailDrawer
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}