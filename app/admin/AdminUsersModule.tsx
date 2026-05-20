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
  currentAdmin: any;
}

export default function AdminUsersModule({ currentAdmin }: AdminUsersModuleProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdmins() {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setAdminUsers(data || []);
      setLoading(false);
    }
    loadAdmins();
  }, []);

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Admin Users</h2>
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
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((admin) => (
                <tr key={admin.id} className="border-b">
                  <td>{admin.full_name || "-"}</td>
                  <td>{admin.email}</td>
                  <td>{admin.role.replace("_", " ").toUpperCase()}</td>
                  <td>{admin.is_active ? "Active" : "Inactive"}</td>
                  <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}