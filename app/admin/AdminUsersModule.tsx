"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

interface AdminUsersModuleProps {
  currentAdmin: {
    id: string;
    role: string;
    email: string;
  };
}

export default function AdminUsersModule({ currentAdmin }: AdminUsersModuleProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = currentAdmin.role === "super_admin";

  useEffect(() => {
    async function loadAdmins() {
      setLoading(true);
      let query = supabase.from("admin_users").select("*").order("created_at", { ascending: false });

      if (!isSuperAdmin) {
        query = query.eq("email", currentAdmin.email);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
        setMessage("Failed to load admin users.");
        setAdminUsers([]);
      } else {
        setAdminUsers(data || []);
      }
      setLoading(false);
    }

    loadAdmins();
  }, [currentAdmin.email, isSuperAdmin]);

  const createAdmin = async () => {
    if (!newAdminName || !newAdminEmail) {
      setMessage("Name and email are required.");
      return;
    }

    setCreating(true);
    const tempPassword = "Capdcoop123!";
    const { data, error } = await supabase.auth.admin.createUser({
      email: newAdminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: newAdminName, role: newAdminRole },
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setCreating(false);
      return;
    }

    const { error: dbError } = await supabase.from("admin_users").insert({
      auth_user_id: data.user.id,
      full_name: newAdminName,
      email: newAdminEmail,
      role: newAdminRole,
      is_active: true,
    });

    if (dbError) {
      console.error(dbError);
      setMessage(dbError.message);
      setCreating(false);
      return;
    }

    setMessage(`Admin created successfully. Temporary password: ${tempPassword}`);
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminRole("admin");
    setCreating(false);

    // Reload admin users
    const { data: updatedAdmins } = await supabase.from("admin_users").select("*").order("created_at", { ascending: false });
    setAdminUsers(updatedAdmins || []);
  };

  const updateAdmin = async (id: string, updates: { role?: string; is_active?: boolean }) => {
    if (id === currentAdmin.id && updates.is_active === false) return; // Prevent self-deactivation

    const { error } = await supabase.from("admin_users").update(updates).eq("id", id);
    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    // Update local state
    setAdminUsers((current) =>
      current.map((admin) => (admin.id === id ? { ...admin, ...updates } : admin))
    );
  };

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Admin Users</h2>
        {message && <div className="mb-4 text-sm text-amber-700 font-semibold">{message}</div>}

        {isSuperAdmin && (
          <div className="mb-6 border p-4 rounded-lg bg-slate-50">
            <h3 className="font-bold mb-2">Create New Admin</h3>
            <div className="grid grid-cols-3 gap-4">
              <input
                placeholder="Full Name"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="Email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="membership_officer">Membership Officer</option>
                <option value="certificate_officer">Certificate Officer</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button onClick={createAdmin} disabled={creating} className="col-span-3 mt-2">
                {creating ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p>Loading admins...</p>
        ) : adminUsers.length === 0 ? (
          <p>No admin users found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.full_name || "-"}</td>
                  <td>{admin.email}</td>
                  <td>{admin.role.replace("_", " ").toUpperCase()}</td>
                  <td>{admin.is_active ? "Active" : "Inactive"}</td>
                  <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="flex gap-2">
                    <select
                      value={admin.role}
                      onChange={(e) => updateAdmin(admin.id, { role: e.target.value })}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="finance">Finance</option>
                      <option value="membership_officer">Membership Officer</option>
                      <option value="certificate_officer">Certificate Officer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <Button
                      disabled={admin.id === currentAdmin.id && admin.role === "super_admin"}
                      onClick={() =>
                        updateAdmin(admin.id, { is_active: !admin.is_active })
                      }
                      className={`px-3 py-1 ${
                        admin.id === currentAdmin.id && admin.role === "super_admin"
                          ? "bg-slate-300 cursor-not-allowed text-slate-600"
                          : admin.is_active
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-700 hover:bg-green-800"
                      }`}
                    >
                      {admin.id === currentAdmin.id && admin.role === "super_admin"
                        ? "Protected"
                        : admin.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}