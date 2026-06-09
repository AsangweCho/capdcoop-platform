"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
};

type AdminPermission = {
  id: string;
  admin_user_id: string;
  permission_key: string;
  is_enabled: boolean;
};

interface AdminUsersModuleProps {
  currentAdmin: {
    id: string;
    role: string;
    email: string;
  };
}

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin / Operations Admin" },
  { value: "finance", label: "Finance Officer" },
  { value: "membership_officer", label: "Membership Officer" },
  { value: "collections_officer", label: "Collections Officer" },
  { value: "aid_officer", label: "Aid Officer" },
  { value: "recovery_officer", label: "Recovery Officer" },
  { value: "agent_supervisor", label: "Agent Supervisor" },
  { value: "auditor", label: "Auditor / Compliance Viewer" },
  { value: "viewer", label: "Viewer" },
];

const PERMISSION_GROUPS = [
  {
    key: "members.manage",
    label: "Member Management",
    description: "View, create, edit members and manage member records.",
  },
  {
    key: "payments.manage",
    label: "Payment Validation",
    description: "View, validate, approve, edit, and manage member payments.",
  },
  {
    key: "collections.manage",
    label: "Collections Control",
    description: "Record, approve, reject, and monitor field collections.",
  },
  {
    key: "aid.manage",
    label: "Aid Management",
    description: "Create, manage, approve, and monitor financial Aid facilities.",
  },
  {
    key: "savings.manage",
    label: "Savings Management",
    description: "View savings accounts, savings deposits, and savings reversals.",
  },
  {
    key: "shares.manage",
    label: "Shares & Certificates",
    description: "Manage share purchases, share balances, and certificates.",
  },
  {
    key: "agents.manage",
    label: "Agents & Commissions",
    description: "Manage agents, teams, commissions, and field performance.",
  },
  {
    key: "reports.view",
    label: "Reports & Command Centre",
    description: "Access reports, dashboards, portfolio and operations summaries.",
  },
  {
    key: "audit.view",
    label: "Audit & Compliance",
    description: "View audit logs, financial event logs, corrections and reversals.",
  },
  {
    key: "corrections.manage",
    label: "High-Risk Corrections",
    description: "Reverse posted records and correct sensitive financial mistakes.",
  },
  {
    key: "admins.manage",
    label: "Admin User Control",
    description: "Create admins, assign permissions, activate and deactivate users.",
  },
];

const ROLE_PERMISSION_TEMPLATES: Record<string, string[]> = {
  super_admin: PERMISSION_GROUPS.map((permission) => permission.key),

  admin: [
    "members.manage",
    "payments.manage",
    "collections.manage",
    "aid.manage",
    "savings.manage",
    "shares.manage",
    "agents.manage",
    "reports.view",
    "audit.view",
  ],

  finance: [
    "payments.manage",
    "collections.manage",
    "savings.manage",
    "shares.manage",
    "reports.view",
    "audit.view",
  ],

  membership_officer: [
    "members.manage",
    "shares.manage",
    "reports.view",
  ],

  collections_officer: [
    "collections.manage",
    "payments.manage",
    "savings.manage",
    "reports.view",
  ],

  aid_officer: [
    "aid.manage",
    "collections.manage",
    "reports.view",
    "audit.view",
  ],

  recovery_officer: [
    "aid.manage",
    "reports.view",
    "audit.view",
  ],

  agent_supervisor: [
    "agents.manage",
    "collections.manage",
    "reports.view",
  ],

  auditor: [
    "members.manage",
    "payments.manage",
    "collections.manage",
    "aid.manage",
    "savings.manage",
    "shares.manage",
    "agents.manage",
    "reports.view",
    "audit.view",
  ],

  viewer: ["reports.view"],
};

const formatRole = (role: string) =>
  role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminUsersModule({ currentAdmin }: AdminUsersModuleProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>(
    ROLE_PERMISSION_TEMPLATES.admin
  );
  const [creating, setCreating] = useState(false);

  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const isSuperAdmin = currentAdmin.role === "super_admin";

  const permissionsByAdmin = useMemo(() => {
    const grouped: Record<string, string[]> = {};

    adminPermissions.forEach((permission) => {
      if (!permission.is_enabled) return;

      if (!grouped[permission.admin_user_id]) {
        grouped[permission.admin_user_id] = [];
      }

      grouped[permission.admin_user_id].push(permission.permission_key);
    });

    return grouped;
  }, [adminPermissions]);

  const loadAdmins = async () => {
    setLoading(true);

    let query = supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSuperAdmin) {
      query = query.eq("email", currentAdmin.email);
    }

    const { data: adminsData, error: adminsError } = await query;

    if (adminsError) {
      console.error(adminsError);
      setMessage("Failed to load admin users.");
      setAdminUsers([]);
      setLoading(false);
      return;
    }

    setAdminUsers(adminsData || []);

    if (isSuperAdmin) {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("admin_permissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (permissionsError) {
        console.error(permissionsError);
        setMessage("Admin users loaded, but permissions failed to load.");
        setAdminPermissions([]);
      } else {
        setAdminPermissions(permissionsData || []);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdmin.email, isSuperAdmin]);

  const toggleNewPermission = (permissionKey: string) => {
    setNewAdminPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey]
    );
  };

  const toggleEditingPermission = (permissionKey: string) => {
    setEditingPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey]
    );
  };

  const applyRoleTemplateToNewAdmin = (role: string) => {
    setNewAdminRole(role);
    setNewAdminPermissions(ROLE_PERMISSION_TEMPLATES[role] || []);
  };

  const createAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      setMessage("Name and email are required.");
      return;
    }

    if (!isSuperAdmin) {
      setMessage("Only Super Admin can create admin users.");
      return;
    }

    setCreating(true);
    setMessage("");

    const tempPassword = "Capdcoop123!";

    const { data, error } = await supabase.auth.admin.createUser({
      email: newAdminEmail.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: newAdminName.trim(),
        role: newAdminRole,
      },
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setCreating(false);
      return;
    }

    const { data: insertedAdmin, error: dbError } = await supabase
      .from("admin_users")
      .insert({
        auth_user_id: data.user.id,
        full_name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        role: newAdminRole,
        is_active: true,
      })
      .select("*")
      .single();

    if (dbError) {
      console.error(dbError);
      setMessage(dbError.message);
      setCreating(false);
      return;
    }

    if (insertedAdmin && newAdminRole !== "super_admin") {
      const { error: permissionError } = await supabase.rpc("admin_set_permissions", {
        p_admin_user_id: insertedAdmin.id,
        p_permissions: newAdminPermissions,
      });

      if (permissionError) {
        console.error(permissionError);
        setMessage(
          `Admin created, but permissions were not assigned: ${permissionError.message}`
        );
        setCreating(false);
        await loadAdmins();
        return;
      }
    }

    setMessage(
      `Admin created successfully. Temporary password: ${tempPassword}. Please ask the admin to change it after first login.`
    );

    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminRole("admin");
    setNewAdminPermissions(ROLE_PERMISSION_TEMPLATES.admin);
    setCreating(false);

    await loadAdmins();
  };

  const updateAdmin = async (
    admin: AdminUser,
    updates: { role?: string; is_active?: boolean }
  ) => {
    if (!isSuperAdmin) {
      setMessage("Only Super Admin can update admin users.");
      return;
    }

    if (admin.id === currentAdmin.id && updates.is_active === false) {
      setMessage("You cannot deactivate your own Super Admin account.");
      return;
    }

    if (admin.role === "super_admin" && updates.is_active === false) {
      setMessage("Super Admin accounts are protected from deactivation here.");
      return;
    }

    const { error } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("id", admin.id);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setAdminUsers((current) =>
      current.map((item) => (item.id === admin.id ? { ...item, ...updates } : item))
    );

    setMessage("Admin updated successfully.");
  };

  const openPermissionEditor = (admin: AdminUser) => {
    if (admin.role === "super_admin") {
      setMessage("Super Admin has full access and does not need checkbox permissions.");
      return;
    }

    setEditingAdmin(admin);
    setEditingPermissions(permissionsByAdmin[admin.id] || []);
    setMessage("");
  };

  const saveAdminPermissions = async () => {
    if (!editingAdmin) return;

    if (!isSuperAdmin) {
      setMessage("Only Super Admin can assign permissions.");
      return;
    }

    if (editingAdmin.role === "super_admin") {
      setMessage("Super Admin permissions cannot be edited.");
      return;
    }

    setSavingPermissions(true);
    setMessage("");

    const { data, error } = await supabase.rpc("admin_set_permissions", {
      p_admin_user_id: editingAdmin.id,
      p_permissions: editingPermissions,
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setSavingPermissions(false);
      return;
    }

    setMessage(data?.message || "Admin permissions updated successfully.");
    setEditingAdmin(null);
    setEditingPermissions([]);
    setSavingPermissions(false);

    await loadAdmins();
  };

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              Admin Users & Role Permissions
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
              Assign one officer multiple operational powers using permission
              checkboxes. Super Admin keeps full control, while office staff receive
              only the access needed for their daily work.
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            Permission Control
          </span>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {message}
          </div>
        )}

        {isSuperAdmin && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#0D2D6E]">
                  Create New Admin
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Select a base role, then tick the operational permissions this
                  officer should have.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <input
                placeholder="Full Name"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#0D2D6E]"
              />

              <input
                placeholder="Email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#0D2D6E]"
              />

              <select
                value={newAdminRole}
                onChange={(e) => applyRoleTemplateToNewAdmin(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#0D2D6E]"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-600">
                  Permission Groups
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    setNewAdminPermissions(PERMISSION_GROUPS.map((item) => item.key))
                  }
                  className="text-xs font-bold text-[#0D2D6E] hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PERMISSION_GROUPS.map((permission) => (
                  <label
                    key={permission.key}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                      newAdminPermissions.includes(permission.key)
                        ? "border-green-300 bg-green-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newAdminPermissions.includes(permission.key)}
                      onChange={() => toggleNewPermission(permission.key)}
                      className="mt-1 h-4 w-4"
                      disabled={newAdminRole === "super_admin"}
                    />

                    <span>
                      <span className="block text-sm font-black text-slate-800">
                        {permission.label}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {newAdminRole === "super_admin" && (
                <p className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  Super Admin automatically has full system access. Checkbox
                  permissions are not needed for this role.
                </p>
              )}
            </div>

            <Button
              onClick={createAdmin}
              disabled={creating}
              className="mt-5 w-full rounded-xl bg-[#0D2D6E] py-3 font-black hover:bg-[#092354]"
            >
              {creating ? "Creating Admin..." : "Create Admin"}
            </Button>
          </div>
        )}

        {loading ? (
          <p className="font-semibold text-slate-600">Loading admins...</p>
        ) : adminUsers.length === 0 ? (
          <p className="font-semibold text-slate-600">No admin users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Name</th>
                  <th className="py-4">Email</th>
                  <th className="py-4">Base Role</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Permissions</th>
                  <th className="py-4">Created</th>
                  <th className="py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {adminUsers.map((admin) => {
                  const permissions = permissionsByAdmin[admin.id] || [];
                  const isProtectedSuperAdmin = admin.role === "super_admin";

                  return (
                    <tr key={admin.id} className="border-b align-top">
                      <td className="py-4 font-black text-[#0D2D6E]">
                        {admin.full_name || "-"}
                      </td>

                      <td className="py-4 font-semibold text-slate-700">
                        {admin.email}
                      </td>

                      <td className="py-4">
                        {isSuperAdmin && !isProtectedSuperAdmin ? (
                          <select
                            value={admin.role}
                            onChange={(e) =>
                              updateAdmin(admin, { role: e.target.value })
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {formatRole(admin.role)}
                          </span>
                        )}
                      </td>

                      <td className="py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            admin.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="py-4">
                        {isProtectedSuperAdmin ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            Full System Access
                          </span>
                        ) : permissions.length > 0 ? (
                          <div className="flex max-w-md flex-wrap gap-2">
                            {permissions.map((permissionKey) => {
                              const permission = PERMISSION_GROUPS.find(
                                (item) => item.key === permissionKey
                              );

                              return (
                                <span
                                  key={permissionKey}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                                >
                                  {permission?.label || permissionKey}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            No permissions assigned
                          </span>
                        )}
                      </td>

                      <td className="py-4 font-semibold text-slate-600">
                        {admin.created_at
                          ? new Date(admin.created_at).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {isSuperAdmin && !isProtectedSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openPermissionEditor(admin)}
                              className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                            >
                              Edit Permissions
                            </button>
                          )}

                          {isSuperAdmin && (
                            <Button
                              disabled={
                                admin.id === currentAdmin.id ||
                                isProtectedSuperAdmin
                              }
                              onClick={() =>
                                updateAdmin(admin, {
                                  is_active: !admin.is_active,
                                })
                              }
                              className={`px-3 py-2 text-xs font-black ${
                                admin.id === currentAdmin.id ||
                                isProtectedSuperAdmin
                                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                                  : admin.is_active
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-700 hover:bg-green-800"
                              }`}
                            >
                              {admin.id === currentAdmin.id || isProtectedSuperAdmin
                                ? "Protected"
                                : admin.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#0D2D6E]">
                    Edit Admin Permissions
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {editingAdmin.full_name} — {editingAdmin.email}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {formatRole(editingAdmin.role)}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingPermissions(
                      ROLE_PERMISSION_TEMPLATES[editingAdmin.role] || []
                    )
                  }
                  className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                >
                  Apply Role Template
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setEditingPermissions(PERMISSION_GROUPS.map((item) => item.key))
                  }
                  className="rounded-lg border border-green-300 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-50"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={() => setEditingPermissions([])}
                  className="rounded-lg border border-red-300 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                >
                  Clear All
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {PERMISSION_GROUPS.map((permission) => (
                  <label
                    key={permission.key}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                      editingPermissions.includes(permission.key)
                        ? "border-green-300 bg-green-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editingPermissions.includes(permission.key)}
                      onChange={() => toggleEditingPermission(permission.key)}
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-black text-slate-800">
                        {permission.label}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAdmin(null);
                    setEditingPermissions([]);
                  }}
                  disabled={savingPermissions}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveAdminPermissions}
                  disabled={savingPermissions}
                  className="rounded-lg bg-[#0D2D6E] px-4 py-2 text-sm font-black text-white hover:bg-[#092354] disabled:opacity-60"
                >
                  {savingPermissions ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}