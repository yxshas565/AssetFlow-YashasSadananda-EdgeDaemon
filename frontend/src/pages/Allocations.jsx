import { useState, useMemo } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import AllocateAssetModal from "../components/AllocateAssetModal";
import TransferRequestModal from "../components/TransferRequestModal";
import "./Allocations.css";

const TABS = ["Allocations", "Transfers"];

export default function Allocations() {
  const [tab, setTab] = useState("Allocations");
  const [banner, setBanner] = useState(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null); // allocation being returned

  const { data: assetsData } = useApi("/assets?limit=200");
  const { data: employeesData } = useApi("/org/employees");
  const assets = assetsData?.items ?? [];
  const employees = employeesData ?? [];

  const allocQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set("active_only", activeOnly);
    p.set("limit", "50");
    return p.toString();
  }, [activeOnly]);

  const { data: allocData, loading: allocLoading, refetch: refetchAlloc } = useApi(`/allocations?${allocQuery}`);
  const { data: transferData, loading: transferLoading, refetch: refetchTransfers } = useApi("/transfers?limit=50");
  const { run: returnAsset } = useApiMutation();
  const { run: approveTransfer } = useApiMutation();
  const { run: rejectTransfer } = useApiMutation();

  const allocations = allocData?.items ?? [];
  const transfers = transferData?.items ?? [];

  const assetLabel = (id) => {
    const a = assets.find((x) => x.id === id);
    return a ? `${a.name} (${a.asset_tag})` : `Asset #${id}`;
  };
  const employeeLabel = (id) => employees.find((e) => e.id === id)?.name ?? `#${id}`;

  const handleReturn = async (allocation, notes) => {
    try {
      await returnAsset(`/allocations/${allocation.id}/return`, { method: "POST", body: { condition_notes: notes || undefined } });
      setBanner({ type: "success", text: "Asset returned." });
      setReturnTarget(null);
      refetchAlloc();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleApproveTransfer = async (id) => {
    try {
      await approveTransfer(`/transfers/${id}/approve`, { method: "PATCH" });
      setBanner({ type: "success", text: "Transfer approved and completed." });
      refetchTransfers();
      refetchAlloc();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleRejectTransfer = async (id) => {
    if (!confirm("Reject this transfer request?")) return;
    try {
      await rejectTransfer(`/transfers/${id}/reject`, { method: "PATCH" });
      setBanner({ type: "success", text: "Transfer rejected." });
      refetchTransfers();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <div className="allocations-page">
      <div className="page-header">
        <div>
          <h1>Allocations</h1>
          <p className="page-subtitle">Allocate assets to employees or departments, and manage transfer requests.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-secondary" onClick={() => setShowTransferModal(true)}>Request Transfer</button>
          <button className="btn btn-primary" onClick={() => setShowAllocateModal(true)}>+ Allocate Asset</button>
        </div>
      </div>

      {banner && (
        <div className={`banner banner-${banner.type}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      <div className="orgsetup-tabs">
        {TABS.map((t) => (
          <button key={t} className={`orgsetup-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Allocations" && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header">
            <h3>Allocations</h3>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Active only
            </label>
          </div>
          {allocLoading && <p className="muted">Loading...</p>}
          <table className="orgsetup-table">
            <thead>
              <tr><th>Asset</th><th>Allocated To</th><th>Allocated At</th><th>Expected Return</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id}>
                  <td>{assetLabel(a.asset_id)}</td>
                  <td>{a.employee_id ? employeeLabel(a.employee_id) : a.department_id ? `Dept #${a.department_id}` : "—"}</td>
                  <td>{new Date(a.allocated_at).toLocaleDateString()}</td>
                  <td>{a.expected_return_date ?? "—"}</td>
                  <td>
                    <span className={`badge ${a.returned_at ? "badge-neutral" : "badge-success"}`}>
                      {a.returned_at ? "Returned" : "Active"}
                    </span>
                  </td>
                  <td>
                    {!a.returned_at && (
                      <button className="btn btn-secondary" onClick={() => setReturnTarget(a)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && !allocLoading && <tr><td colSpan={6} className="muted">No allocations found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Transfers" && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header"><h3>Transfer Requests</h3></div>
          {transferLoading && <p className="muted">Loading...</p>}
          <table className="orgsetup-table">
            <thead>
              <tr><th>Asset</th><th>From</th><th>To</th><th>Requested</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td>{assetLabel(t.asset_id)}</td>
                  <td>{t.from_employee_id ? employeeLabel(t.from_employee_id) : "—"}</td>
                  <td>{employeeLabel(t.to_employee_id)}</td>
                  <td>{new Date(t.requested_at).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span></td>
                  <td>
                    {t.status === "Requested" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-primary" onClick={() => handleApproveTransfer(t.id)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Approve</button>
                        <button className="btn btn-danger" onClick={() => handleRejectTransfer(t.id)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && !transferLoading && <tr><td colSpan={6} className="muted">No transfer requests.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showAllocateModal && (
        <AllocateAssetModal
          assets={assets.filter((a) => a.status === "Available")}
          employees={employees}
          onClose={() => setShowAllocateModal(false)}
          onCreated={() => { setShowAllocateModal(false); refetchAlloc(); setBanner({ type: "success", text: "Asset allocated." }); }}
        />
      )}

      {showTransferModal && (
        <TransferRequestModal
          assets={assets}
          employees={employees}
          onClose={() => setShowTransferModal(false)}
          onCreated={() => { setShowTransferModal(false); refetchTransfers(); setBanner({ type: "success", text: "Transfer requested." }); }}
        />
      )}

      {returnTarget && (
        <ReturnConfirmModal
          allocation={returnTarget}
          assetLabel={assetLabel(returnTarget.asset_id)}
          onClose={() => setReturnTarget(null)}
          onConfirm={(notes) => handleReturn(returnTarget, notes)}
        />
      )}
    </div>
  );
}

function ReturnConfirmModal({ allocation, assetLabel, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Return Asset</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>{assetLabel}</p>
        <label>
          Condition notes (optional)
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm(notes)}>Confirm Return</button>
        </div>
      </div>
    </div>
  );
}