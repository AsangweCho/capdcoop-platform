"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

type AuditLog = {
  id: string;
  action: string;
  actor_admin_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string;
  entity_id: string;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
};

interface AuditLogModuleProps {
  currentAdmin: { id: string; role: string; email: string };
}

export default function AuditLogModule({ currentAdmin }: AuditLogModuleProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const canViewAudit = currentAdmin.role === "super_admin" || currentAdmin.role === "admin";

  async function loadAuditLogs() {
    if (!canViewAudit) return;

    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLogs([]);
      setLoadingLogs(false);
      return;
    }

    setLogs(data || []);
    setLoadingLogs(false);
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Audit Logs</h2>

        {!canViewAudit && (
          <p className="text-red-600 font-semibold">
            You do not have permission to view audit logs.
          </p>
        )}

        {loadingLogs ? (
          <p className="text-sm font-semibold text-slate-600">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm font-semibold text-slate-600">No audit logs found.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-3">Action</th>
                  <th className="py-3">Actor Email</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Entity</th>
                  <th className="py-3">Entity ID</th>
                  <th className="py-3">Old Value</th>
                  <th className="py-3">New Value</th>
                  <th className="py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-4 font-bold">{log.action}</td>
                    <td className="py-4 text-slate-600">{log.actor_email || "-"}</td>
                    <td className="py-4">{log.actor_role || "-"}</td>
                    <td className="py-4">{log.entity_type}</td>
                    <td className="py-4">{log.entity_id}</td>
                    <td className="py-4">
                      <pre className="whitespace-pre-wrap max-w-[200px]">{JSON.stringify(log.old_value)}</pre>
                    </td>
                    <td className="py-4">
                      <pre className="whitespace-pre-wrap max-w-[200px]">{JSON.stringify(log.new_value)}</pre>
                    </td>
                    <td className="py-4">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}