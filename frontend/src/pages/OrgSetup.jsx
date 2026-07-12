import { useState } from "react";
import { useApi, useApiMutation } from "../api/useApi";
import DepartmentFormModal from "../components/DepartmentFormModal";
import CategoryFormModal from "../components/CategoryFormModal";
import RolePromoteModal from "../components/RolePromoteModal";
import "./OrgSetup.css";

const TABS = ["Departments", "Categories", "Employees"];

export default function OrgSetup() {
  const [tab, setTab] = useState("Departments");
  const [banner, setBanner] = useState(null);

  const { data: departments, refetch: refetchDepts } = useApi("/org/departments");
  const { data: categories, refetch: refetchCats } = useApi("/org/categories");
  const { data: employees, refetch: refetchEmps } = useApi("/org/employees");

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState(null); // employee object or null

  const { run: deactivateDept } = useApiMutation();
  const { run: deactivateCat } = useApiMutation();

  const handleDeactivateDept = async (id) => {
    if (!confirm("Deactivate this department?")) return;
    try {
      await deactivateDept(`/org/departments/${id}`, { method: "DELETE" });
      setBanner({ type: "success", text: "Department deactivated." });
      refetchDepts();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const handleDeactivateCat = async (id) => {
    if (!confirm("Deactivate this category?")) return;
    try {
      await deactivateCat(`/org/categories/${id}`, { method: "DELETE" });
      setBanner({ type: "success", text: "Category deactivated." });
      refetchCats();
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <div className="orgsetup-page">
      <div className="page-header">
        <div>
          <h1>Org Setup</h1>
          <p className="page-subtitle">Manage departments, asset categories, and employee roles. Admin-only.</p>
        </div>
      </div>

      {banner && (
        <div className={`banner banner-${banner.type}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      <div className="orgsetup-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`orgsetup-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Departments" && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header">
            <h3>Departments</h3>
            <button className="btn btn-primary" onClick={() => setShowDeptModal(true)}>+ New Department</button>
          </div>
          <table className="orgsetup-table">
            <thead>
              <tr><th>Name</th><th>Parent</th><th>Head</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(departments ?? []).map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.parent_department_id ? departments.find(x => x.id === d.parent_department_id)?.name ?? `#${d.parent_department_id}` : "—"}</td>
                  <td>{d.head_employee_id ? employees?.find(e => e.id === d.head_employee_id)?.name ?? `#${d.head_employee_id}` : "—"}</td>
                  <td><span className={`badge ${d.is_active ? "badge-success" : "badge-neutral"}`}>{d.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    {d.is_active && (
                      <button className="btn btn-secondary" onClick={() => handleDeactivateDept(d.id)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(departments ?? []).length === 0 && <tr><td colSpan={5} className="muted">No departments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Categories" && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header">
            <h3>Asset Categories</h3>
            <button className="btn btn-primary" onClick={() => setShowCatModal(true)}>+ New Category</button>
          </div>
          <table className="orgsetup-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><span className={`badge ${c.is_active ? "badge-success" : "badge-neutral"}`}>{c.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    {c.is_active && (
                      <button className="btn btn-secondary" onClick={() => handleDeactivateCat(c.id)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(categories ?? []).length === 0 && <tr><td colSpan={3} className="muted">No categories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Employees" && (
        <div className="surface orgsetup-panel">
          <div className="orgsetup-panel-header">
            <h3>Employee Directory</h3>
          </div>
          <table className="orgsetup-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {(employees ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td><span className="badge badge-neutral">{e.role}</span></td>
                  <td>{e.department_id ? departments?.find(d => d.id === e.department_id)?.name ?? `#${e.department_id}` : "—"}</td>
                  <td><span className={`badge ${e.is_active ? "badge-success" : "badge-neutral"}`}>{e.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setPromoteTarget(e)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                      Change Role
                    </button>
                  </td>
                </tr>
              ))}
              {(employees ?? []).length === 0 && <tr><td colSpan={6} className="muted">No employees yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showDeptModal && (
        <DepartmentFormModal
          departments={departments ?? []}
          employees={employees ?? []}
          onClose={() => setShowDeptModal(false)}
          onCreated={() => { setShowDeptModal(false); refetchDepts(); setBanner({ type: "success", text: "Department created." }); }}
        />
      )}

      {showCatModal && (
        <CategoryFormModal
          onClose={() => setShowCatModal(false)}
          onCreated={() => { setShowCatModal(false); refetchCats(); setBanner({ type: "success", text: "Category created." }); }}
        />
      )}

      {promoteTarget && (
        <RolePromoteModal
          employee={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onPromoted={() => { setPromoteTarget(null); refetchEmps(); setBanner({ type: "success", text: "Role updated." }); }}
        />
      )}
    </div>
  );
}