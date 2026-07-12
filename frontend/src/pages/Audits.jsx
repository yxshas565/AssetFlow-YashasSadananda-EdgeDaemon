import { useState } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import AuditCycleFormModal from "../components/AuditCycleFormModal";
import AuditFindingModal from "../components/AuditFindingModal";
import "../pages/OrgSetup.css";
import "./Audits.css";

export default function Audits() {
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null); // cycle object for drill-in
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [banner, setBanner] = useState(null);

  const { data: cycles, refetch: refetchCycles } = useApi("/audits");
  const { data: employeesData } = useApi("/org/employees");
  const { data: assetsData } = useApi("/assets?limit=200");
  const employees = employeesData ?? [];
  const assets = assetsData?.items ?? [];

  const { data: findings, refetch: refetchFindings } = useApi(
    selectedCycle ? `/audits/${selectedCycle.id}/findings` : null,
    { skip: !selectedCycle }
  );

  const { run: closeCycle } = useApiMutation();
  const { run: resolveFinding } = useApiMutation();
  const { run: assignAuditor } = useApiMutation();

  const assetLabel = (id) => {
    const a = assets.find((x) => x.id === id);
    return a ? `${a.name} (${a.asset_tag})` : `Asset #${id}`;
  };

  const handleCloseCycle = async (cycle) => {
    if (!confirm(`Close audit cycle #${cycle.id}? Unresolved findings will overwrite live asset statuses.`)) return;
    try {
      await closeCycle(`/audits/${cycle.id}/close`, { method: "PATCH" });
      setBanner({ type: "success", text: "Audit cycle closed — asset statuses reconciled." });
      refetchCycles();
      if (selectedCycle?.id === cycle.id) refetchFindings();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleResolveFinding = async (findingId, note) => {
    try {
      await resolveFinding(`/audits/${selectedCycle.id}/findings/${findingId}/resolve`, {
        method: "PATCH",
        body: { resolution_note: note },
      });
      setBanner({ type: "success", text: "Finding resolved." });
      refetchFindings();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <div className="audits-page">
      <div className="page-header">
        <div>
          <h1>Audits</h1>
          <p className="page-subtitle">Audit cycles reconcile expected vs observed asset status on closure.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCycleModal(true)}>+ New Audit Cycle</button>
      </div>

      {banner && (
        <div className={`banner banner-${banner.type}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      <div className="surface orgsetup-panel">
        <div className="orgsetup-panel-header"><h3>Audit Cycles</h3></div>
        <table className="orgsetup-table">
          <thead>
            <tr><th>ID</th><th>Scope</th><th>Start</th><th>End</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(cycles ?? []).map((c) => (
              <tr key={c.id} className={selectedCycle?.id === c.id ? "row-selected" : ""}>
                <td>#{c.id}</td>
                <td>{c.scope_location ?? (c.scope_department_id ? `Dept #${c.scope_department_id}` : "Organization-wide")}</td>
                <td>{c.start_date}</td>
                <td>{c.end_date}</td>
                <td><span className={`badge ${c.status === "Completed" ? "badge-neutral" : c.status === "InProgress" ? "badge-warning" : "badge-success"}`}>{c.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => setSelectedCycle(c)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                      View Findings
                    </button>
                    {c.status !== "Completed" && (
                      <button className="btn btn-danger" onClick={() => handleCloseCycle(c)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        Close Cycle
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(cycles ?? []).length === 0 && <tr><td colSpan={6} className="muted">No audit cycles yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedCycle && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header">
            <h3>Findings — Cycle #{selectedCycle.id}</h3>
            {selectedCycle.status !== "Completed" && (
              <button className="btn btn-primary" onClick={() => setShowFindingModal(true)}>+ Record Finding</button>
            )}
          </div>
          <table className="orgsetup-table">
            <thead>
              <tr><th>Asset</th><th>Expected</th><th>Observed</th><th>Discrepancy</th><th>Resolved</th><th></th></tr>
            </thead>
            <tbody>
              {(findings ?? []).map((f) => (
                <tr key={f.id}>
                  <td>{assetLabel(f.asset_id)}</td>
                  <td>{f.expected_status}</td>
                  <td>{f.observed_status}</td>
                  <td>{f.discrepancy_type ? <span className="badge badge-danger">{f.discrepancy_type}</span> : <span className="badge badge-success">Match</span>}</td>
                  <td><span className={`badge ${f.resolved ? "badge-neutral" : "badge-warning"}`}>{f.resolved ? "Resolved" : "Open"}</span></td>
                  <td>
                    {!f.resolved && (
                      <ResolveInline findingId={f.id} onResolve={(note) => handleResolveFinding(f.id, note)} />
                    )}
                  </td>
                </tr>
              ))}
              {(findings ?? []).length === 0 && <tr><td colSpan={6} className="muted">No findings recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCycleModal && (
        <AuditCycleFormModal
          onClose={() => setShowCycleModal(false)}
          onCreated={() => { setShowCycleModal(false); refetchCycles(); setBanner({ type: "success", text: "Audit cycle created." }); }}
        />
      )}

      {showFindingModal && selectedCycle && (
        <AuditFindingModal
          cycleId={selectedCycle.id}
          assets={assets}
          onClose={() => setShowFindingModal(false)}
          onCreated={() => { setShowFindingModal(false); refetchFindings(); setBanner({ type: "success", text: "Finding recorded." }); }}
        />
      )}
    </div>
  );
}

function ResolveInline({ findingId, onResolve }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn btn-secondary" onClick={() => setOpen(true)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
        Resolve
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      <input className="input" style={{ minWidth: 160 }} placeholder="Resolution note" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        className="btn btn-primary"
        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
        onClick={() => { if (note.trim()) onResolve(note.trim()); }}
      >
        Save
      </button>
    </div>
  );
}