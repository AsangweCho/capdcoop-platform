"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  actor_email: string;
  old_value: any;
  new_value: any;
  created_at: string;
};

interface AuditLogsModuleProps {
  currentAdmin: any;
}

export default function AuditLogsModule({ currentAdmin }: AuditLogsModuleProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setAuditLogs(data || []);
      setLoading(false);
    }
    loadLogs();
  }, []);

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
        {loading ? (
          <p>Loading audit logs...</p>
        ) : auditLogs.length === 0 ? (
          <p>No logs found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td>{log.action}</td>
                  <td>{log.entity_type}</td>
                  <td>{log.actor_email}</td>
                  <td>{new Date(log.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}