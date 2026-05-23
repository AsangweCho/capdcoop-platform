"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Commission = {
  id: string;
  agent_id: string | null;
  member_id: string | null;
  payment_id: string | null;
  commission_type: string;
  base_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  agents?: {
    full_name: string;
    agent_code: string;
  } | null;
  members?: {
    full_name: string;
    member_number: string | null;
  } | null;
};

export default function CommissionsModule() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadCommissions();
  }, []);

  async function loadCommissions() {
    const { data, error } = await supabase
      .from("agent_commissions")
      .select(`
        *,
        agents (
          full_name,
          agent_code
        ),
        members (
          full_name,
          member_number
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setCommissions([]);
      return;
    }

    setCommissions((data as unknown as Commission[]) || []);
  }

  async function markPaid(commission: Commission) {
    const confirmed = window.confirm("Mark this commission as paid?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("agent_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", commission.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Commission marked as paid.");
    await loadCommissions();
  }

  async function reverseCommission(commission: Commission) {
    const confirmed = window.confirm("Reverse this commission?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("agent_commissions")
      .update({
        status: "reversed",
      })
      .eq("id", commission.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Commission reversed.");
    await loadCommissions();
  }

  const filteredCommissions = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  const totalGenerated = commissions.reduce(
    (sum, c) => sum + Number(c.commission_amount || 0),
    0
  );

  const pendingTotal = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const paidTotal = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const reversedTotal = commissions
    .filter((c) => c.status === "reversed")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Generated"
          value={`FCFA ${totalGenerated.toLocaleString()}`}
        />
        <MetricCard
          title="Pending"
          value={`FCFA ${pendingTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Paid"
          value={`FCFA ${paidTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Reversed"
          value={`FCFA ${reversedTotal.toLocaleString()}`}
        />
      </div>

      {message && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {message}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#0D2D6E]">
                Commission Command Centre
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Track agent commissions generated from approved member payments.
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
            >
              <option value="all">All Commissions</option>
              <option value="pending">Pending Only</option>
              <option value="paid">Paid Only</option>
              <option value="reversed">Reversed Only</option>
            </select>
          </div>

          {filteredCommissions.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-slate-50 p-5 font-semibold text-slate-600">
              No commissions found yet. Approve a payment for a member linked to
              an active agent to generate commission.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Agent</th>
                    <th className="py-4">Member</th>
                    <th className="py-4">Type</th>
                    <th className="py-4">Base Amount</th>
                    <th className="py-4">Rate</th>
                    <th className="py-4">Commission</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Date</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {commission.agents?.full_name || "-"}
                        <span className="block text-xs text-slate-500">
                          {commission.agents?.agent_code || ""}
                        </span>
                      </td>

                      <td className="py-4 text-slate-600">
                        {commission.members?.full_name || "-"}
                        <span className="block text-xs">
                          {commission.members?.member_number || ""}
                        </span>
                      </td>

                      <td className="py-4 text-slate-600">
                        {commission.commission_type}
                      </td>

                      <td className="py-4 font-bold">
                        FCFA {Number(commission.base_amount || 0).toLocaleString()}
                      </td>

                      <td className="py-4">
                        {Number(commission.commission_rate || 0)}%
                      </td>

                      <td className="py-4 font-black text-[#0D2D6E]">
                        FCFA{" "}
                        {Number(
                          commission.commission_amount || 0
                        ).toLocaleString()}
                      </td>

                      <td className="py-4">
                        <span
                          className={
                            commission.status === "paid"
                              ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                              : commission.status === "reversed"
                              ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                              : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                          }
                        >
                          {commission.status}
                        </span>
                      </td>

                      <td className="py-4 text-slate-600">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4">
                        <div className="flex gap-2">
                          {commission.status === "pending" && (
                            <Button
                              onClick={() => markPaid(commission)}
                              className="px-4 py-2"
                            >
                              Mark Paid
                            </Button>
                          )}

                          {commission.status !== "reversed" && (
                            <button
                              onClick={() => reverseCommission(commission)}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                            >
                              Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#0D2D6E]">{value}</p>
    </div>
  );
}