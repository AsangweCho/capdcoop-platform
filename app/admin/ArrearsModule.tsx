"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ArrearsRow = {
  id: string;
  loan_id: string;
  member_id: string | null;
  installment_number: number;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  arrears_amount: number;
  status: string;
  loans?: {
    id: string;
    business_name: string | null;
    loan_amount: number;
    outstanding_balance: number | null;
    members?: {
      full_name: string;
      member_number: string | null;
      phone: string | null;
    } | null;
  } | null;
};

type RecoveryNote = {
  id: string;
  loan_id: string | null;
  member_id: string | null;
  recovery_status: string;
  priority: string;
  assigned_to: string | null;
  note: string | null;
  promise_to_pay_date: string | null;
  promised_amount: number | null;
  created_at: string;
};

export default function ArrearsModule({ currentAdmin }: { currentAdmin: any }) {
  const [arrearsRows, setArrearsRows] = useState<ArrearsRow[]>([]);
  const [recoveryNotes, setRecoveryNotes] = useState<RecoveryNote[]>([]);
  const [message, setMessage] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("normal");
  const [promiseDate, setPromiseDate] = useState("");
  const [promisedAmount, setPromisedAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadArrears();
    loadRecoveryNotes();
  }, []);

  async function markOverdue() {
    const { error } = await supabase
      .from("loan_repayment_schedule")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .in("status", ["pending", "partial"]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Overdue schedules refreshed.");
    await loadArrears();
  }

  async function loadArrears() {
    const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

const nextTwoDays = new Date();
nextTwoDays.setDate(today.getDate() + 2);

const nextTwoDaysStr = nextTwoDays.toISOString().slice(0, 10);

const { data, error } = await supabase
  .from("loan_repayment_schedule")
  .select(`
    id,
    loan_id,
    member_id,
    installment_number,
    due_date,
    expected_amount,
    paid_amount,
    arrears_amount,
    status,
    loans (
      id,
      business_name,
      loan_amount,
      outstanding_balance,
      members (
        full_name,
        member_number,
        phone
      )
    )
  `)
  .or(
    `status.eq.overdue,and(status.eq.pending,due_date.gte.${todayStr},due_date.lte.${nextTwoDaysStr}),status.eq.partial`
  )
  .order("due_date", { ascending: true });
    if (error) {
      setMessage(error.message);
      return;
    }

    setArrearsRows((data as unknown as ArrearsRow[]) || []);
  }

  async function loadRecoveryNotes() {
    const { data, error } = await supabase
      .from("loan_recovery_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRecoveryNotes((data as RecoveryNote[]) || []);
  }

  function openRecovery(row: ArrearsRow) {
    setSelectedLoanId(row.loan_id);
    setSelectedMemberId(row.member_id || "");
    setPromisedAmount(String(row.arrears_amount || ""));
    setPriority(Number(row.arrears_amount || 0) > 50000 ? "high" : "normal");
  }

  async function saveRecoveryNote() {
    if (!selectedLoanId) {
      setMessage("Select an overdue loan first.");
      return;
    }

    if (!note.trim()) {
      setMessage("Recovery note is required.");
      return;
    }

    const { error } = await supabase.from("loan_recovery_notes").insert({
      loan_id: selectedLoanId,
      member_id: selectedMemberId || null,
      recovery_status: "open",
      priority,
      assigned_to: assignedTo.trim() || null,
      note: note.trim(),
      promise_to_pay_date: promiseDate || null,
      promised_amount: Number(promisedAmount || 0),
      created_by: currentAdmin?.id || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Recovery note saved.");
    setSelectedLoanId("");
    setSelectedMemberId("");
    setAssignedTo("");
    setPriority("normal");
    setPromiseDate("");
    setPromisedAmount("");
    setNote("");

    await loadRecoveryNotes();
  }

  const overdueRows = arrearsRows.filter((row) => row.status === "overdue");
  const partialRows = arrearsRows.filter((row) => row.status === "partial");

  const totalArrears = arrearsRows.reduce(
    (sum, row) => sum + Number(row.arrears_amount || 0),
    0
  );

  const overdueArrears = overdueRows.reduce(
    (sum, row) => sum + Number(row.arrears_amount || 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Arrears" value={`FCFA ${totalArrears.toLocaleString()}`} />
        <MetricCard title="Overdue Arrears" value={`FCFA ${overdueArrears.toLocaleString()}`} />
        <MetricCard title="Overdue Installments" value={overdueRows.length.toString()} />
        <MetricCard title="Partial Installments" value={partialRows.length.toString()} />
      </div>

      {message && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {message}
        </div>
      )}

      <div>
        <Button onClick={markOverdue} className="px-6 py-3">
          Refresh Overdue Status
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Arrears & Recovery Queue
          </h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Member</th>
                  <th className="py-4">Business</th>
                  <th className="py-4">Due Date</th>
                  <th className="py-4">Expected</th>
                  <th className="py-4">Paid</th>
                  <th className="py-4">Arrears</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {arrearsRows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {row.loans?.members?.full_name || "-"}
                      <span className="block text-xs text-slate-500">
                        {row.loans?.members?.member_number || ""}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {row.loans?.members?.phone || ""}
                      </span>
                    </td>

                    <td className="py-4">{row.loans?.business_name || "-"}</td>
                    <td className="py-4">{row.due_date}</td>

                    <td className="py-4 font-bold">
                      FCFA {Number(row.expected_amount || 0).toLocaleString()}
                    </td>

                    <td className="py-4 font-bold">
                      FCFA {Number(row.paid_amount || 0).toLocaleString()}
                    </td>

                    <td className="py-4 font-black text-red-600">
                      FCFA {Number(row.arrears_amount || 0).toLocaleString()}
                    </td>

                    <td className="py-4 capitalize">
                      <span
                        className={
                          row.status === "overdue"
                            ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                            : row.status === "partial"
                            ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                        }
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="py-4">
                      <Button onClick={() => openRecovery(row)} className="px-4 py-2">
                        Add Note
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Recovery Follow-up Note
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Assigned recovery officer"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>

            <input
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />

            <input
              type="number"
              value={promisedAmount}
              onChange={(e) => setPromisedAmount(e.target.value)}
              placeholder="Promised amount"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Recovery note / client response / next action"
              className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2"
            />
          </div>

          <Button onClick={saveRecoveryNote} className="mt-6 px-6 py-3">
            Save Recovery Note
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Recent Recovery Notes
          </h2>

          <div className="mt-6 space-y-4">
            {recoveryNotes.length === 0 ? (
              <p className="font-semibold text-slate-600">
                No recovery notes yet.
              </p>
            ) : (
              recoveryNotes.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <p className="font-black text-[#0D2D6E]">
                      {item.priority?.toUpperCase()} · {item.recovery_status}
                    </p>
                    <p className="text-sm font-semibold text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {item.note}
                  </p>

                  {item.promise_to_pay_date && (
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Promise: FCFA{" "}
                      {Number(item.promised_amount || 0).toLocaleString()} on{" "}
                      {item.promise_to_pay_date}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-3 text-2xl font-black text-[#0D2D6E]">{value}</p>
      </CardContent>
    </Card>
  );
}
