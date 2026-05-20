"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MemberRecord = {
  id: string;
  full_name: string;
  member_number: string | null;
};

type Loan = {
  id: string;
  member_id: string | null;
  business_name: string | null;
  loan_amount: number;
  interest_rate: number;
  insurance_rate: number;
  insurance_fee: number;
  registration_fee: number;
  duration_days: number;
  daily_payment_amount: number;
  total_expected_repayment: number;
  purpose: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  assigned_officer: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LoanRepayment = {
  id: string;
  loan_id: string;
  member_id: string | null;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  balance_remaining: number;
  payment_status: string;
  payment_method: string | null;
  reference: string | null;
  collected_by: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function LoanModule({ currentAdmin }: { currentAdmin: any }) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>([]);

  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingLoanRepayments, setLoadingLoanRepayments] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);

  const [message, setMessage] = useState("");

  const [repaymentFilter, setRepaymentFilter] = useState<
    "all" | "due_today" | "overdue" | "pending" | "partial" | "paid" | "missed"
  >("all");

  const [repaymentInputs, setRepaymentInputs] = useState<
    Record<
      string,
      {
        paid_amount: string;
        payment_method: string;
        reference: string;
        notes: string;
      }
    >
  >({});

  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    member_id: "",
    business_name: "",
    loan_amount: 0,
    interest_rate: 3,
    insurance_rate: 2.5,
    registration_fee: 5000,
    duration_days: 30,
    purpose: "",
    status: "draft",
  });

  const canManageLoans =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "finance";

  function calculateLoanTotals(loan: Partial<Loan>) {
    const amount = Number(loan.loan_amount || 0);
    const insurance = (amount * Number(loan.insurance_rate || 2.5)) / 100;
    const totalRepayment =
      amount + insurance + Number(loan.registration_fee || 5000);
    const dailyPayment = totalRepayment / Number(loan.duration_days || 30);

    return { insurance, totalRepayment, dailyPayment };
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, member_number")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setMembers((data as MemberRecord[]) || []);
  }

  async function loadLoans() {
    setLoadingLoans(true);

    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to load loans.");
      setLoadingLoans(false);
      return;
    }

    setLoans((data as Loan[]) || []);
    setLoadingLoans(false);
  }

  async function loadLoanRepayments() {
    setLoadingLoanRepayments(true);

    const { data, error } = await supabase
      .from("loan_repayments")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to load repayments.");
      setLoadingLoanRepayments(false);
      return;
    }

    setLoanRepayments((data as LoanRepayment[]) || []);
    setLoadingLoanRepayments(false);
  }

  useEffect(() => {
    loadMembers();
    loadLoans();
    loadLoanRepayments();
  }, []);

  async function createLoan() {
    if (!canManageLoans) {
      setMessage("You do not have permission to create loans.");
      return;
    }

    if (!newLoan.member_id || !newLoan.loan_amount) {
      setMessage("Member and loan amount are required.");
      return;
    }

    setCreatingLoan(true);
    setMessage("");

    const { insurance, totalRepayment, dailyPayment } =
      calculateLoanTotals(newLoan);

    const { data, error } = await supabase
      .from("loans")
      .insert([
        {
          member_id: newLoan.member_id,
          business_name: newLoan.business_name,
          loan_amount: Number(newLoan.loan_amount || 0),
          interest_rate: Number(newLoan.interest_rate || 3),
          insurance_rate: Number(newLoan.insurance_rate || 2.5),
          insurance_fee: insurance,
          registration_fee: Number(newLoan.registration_fee || 5000),
          duration_days: Number(newLoan.duration_days || 30),
          daily_payment_amount: dailyPayment,
          total_expected_repayment: totalRepayment,
          purpose: newLoan.purpose,
          status: newLoan.status || "draft",
          assigned_officer: currentAdmin?.full_name || null,
          created_by: currentAdmin?.id || null,
        },
      ])
      .select();

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to create loan.");
      setCreatingLoan(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_admin_id: currentAdmin?.id,
      actor_auth_user_id: currentAdmin?.auth_user_id,
      actor_email: currentAdmin?.email,
      actor_role: currentAdmin?.role,
      action: "loan_created",
      entity_type: "loan",
      entity_id: data?.[0]?.id || null,
      new_value: data?.[0] || null,
    });

    setMessage("Loan created successfully.");
    setNewLoan({
      member_id: "",
      business_name: "",
      loan_amount: 0,
      interest_rate: 3,
      insurance_rate: 2.5,
      registration_fee: 5000,
      duration_days: 30,
      purpose: "",
      status: "draft",
    });

    await loadLoans();
    setCreatingLoan(false);
  }

  async function activateLoan(loan: Loan) {
    if (!canManageLoans) {
      setMessage("You do not have permission to activate loans.");
      return;
    }

    if (loan.status === "active") {
      setMessage("Loan is already active.");
      return;
    }

    const startDate = loan.start_date ? new Date(loan.start_date) : new Date();

    const repayments = Array.from({ length: loan.duration_days }, (_, index) => {
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + index);

      return {
        loan_id: loan.id,
        member_id: loan.member_id,
        due_date: dueDate.toISOString().split("T")[0],
        expected_amount: loan.daily_payment_amount,
        paid_amount: 0,
        balance_remaining:
          Number(loan.total_expected_repayment || 0) -
          Number(loan.daily_payment_amount || 0) * index,
        payment_status: "pending",
      };
    });

    const { error: repaymentError } = await supabase
      .from("loan_repayments")
      .insert(repayments);

    if (repaymentError) {
      console.error(repaymentError);
      setMessage("Failed to generate repayment schedule.");
      return;
    }

    const { error: loanError } = await supabase
      .from("loans")
      .update({
        status: "active",
        start_date: startDate.toISOString().split("T")[0],
        end_date: repayments[repayments.length - 1]?.due_date,
      })
      .eq("id", loan.id);

    if (loanError) {
      console.error(loanError);
      setMessage("Failed to activate loan.");
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_admin_id: currentAdmin?.id,
      actor_auth_user_id: currentAdmin?.auth_user_id,
      actor_email: currentAdmin?.email,
      actor_role: currentAdmin?.role,
      action: "loan_activated",
      entity_type: "loan",
      entity_id: loan.id,
      old_value: { status: loan.status },
      new_value: {
        status: "active",
        repayment_days: loan.duration_days,
        daily_payment_amount: loan.daily_payment_amount,
        total_expected_repayment: loan.total_expected_repayment,
      },
      metadata: {
        member_id: loan.member_id,
        business_name: loan.business_name,
      },
    });

    setMessage("Loan activated and repayment schedule generated.");
    await loadLoans();
    await loadLoanRepayments();
  }

  async function updateRepayment(
    repaymentId: string,
    updates: {
      payment_status?: string;
      paid_amount?: number;
      payment_method?: string;
      reference?: string;
      notes?: string;
    }
  ) {
    if (!canManageLoans) {
      setMessage("You do not have permission to update repayments.");
      return;
    }

    const repayment = loanRepayments.find((r) => r.id === repaymentId);

    if (!repayment) {
      setMessage("Repayment record not found.");
      return;
    }

    const paidAmount =
      updates.paid_amount !== undefined
        ? Number(updates.paid_amount)
        : Number(repayment.paid_amount || 0);

    const expectedAmount = Number(repayment.expected_amount || 0);
    const balanceRemaining = Math.max(expectedAmount - paidAmount, 0);

    const calculatedStatus =
      updates.payment_status ||
      (paidAmount >= expectedAmount
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "missed");

    const payload = {
      payment_status: calculatedStatus,
      paid_amount: paidAmount,
      balance_remaining: balanceRemaining,
      payment_method: updates.payment_method || repayment.payment_method,
      reference: updates.reference || repayment.reference,
      notes: updates.notes || repayment.notes,
      collected_by: currentAdmin?.id || null,
    };

    const { error } = await supabase
      .from("loan_repayments")
      .update(payload)
      .eq("id", repaymentId);

    if (error) {
      console.error(error);
      setMessage("Failed to update repayment.");
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_admin_id: currentAdmin?.id,
      actor_auth_user_id: currentAdmin?.auth_user_id,
      actor_email: currentAdmin?.email,
      actor_role: currentAdmin?.role,
      action: "repayment_updated",
      entity_type: "loan_repayment",
      entity_id: repaymentId,
      old_value: repayment,
      new_value: payload,
    });

    setMessage("Repayment updated.");
    await loadLoanRepayments();
  }

  const filteredRepayments = loanRepayments.filter((r) => {
    const today = new Date().toISOString().split("T")[0];

    switch (repaymentFilter) {
      case "due_today":
        return r.due_date === today;
      case "overdue":
        return r.due_date < today && r.payment_status === "pending";
      case "pending":
        return r.payment_status === "pending";
      case "partial":
        return r.payment_status === "partial";
      case "paid":
        return r.payment_status === "paid";
      case "missed":
        return r.payment_status === "missed";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-8">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Create New Loan
          </h2>

          {message && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {message}
            </div>
          )}

          {canManageLoans && (
            <>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  value={newLoan.member_id || ""}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, member_id: e.target.value })
                  }
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.member_number || "No No."})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Business Name"
                  value={newLoan.business_name || ""}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, business_name: e.target.value })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />

                <input
                  type="number"
                  placeholder="Loan Amount"
                  value={newLoan.loan_amount || ""}
                  onChange={(e) =>
                    setNewLoan({
                      ...newLoan,
                      loan_amount: Number(e.target.value),
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />

                <input
                  type="number"
                  placeholder="Duration in days"
                  value={newLoan.duration_days ?? ""}
                  onChange={(e) =>
                    setNewLoan({
                      ...newLoan,
                      duration_days: Number(e.target.value),
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />

                <input
                  type="text"
                  placeholder="Purpose"
                  value={newLoan.purpose || ""}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, purpose: e.target.value })
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none md:col-span-2"
                />
              </div>

              <Button
                onClick={createLoan}
                disabled={creatingLoan}
                className="mt-6 px-6 py-3"
              >
                {creatingLoan ? "Creating..." : "Create Loan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Loan Management
          </h2>

          {loadingLoans ? (
            <p className="mt-6 font-semibold text-slate-600">
              Loading loans...
            </p>
          ) : loans.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No loans created yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Business</th>
                    <th className="py-4">Amount</th>
                    <th className="py-4">Daily</th>
                    <th className="py-4">Duration</th>
                    <th className="py-4">Total</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Created</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {loan.business_name || "-"}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA{" "}
                        {Number(loan.daily_payment_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4">{loan.duration_days} days</td>
                      <td className="py-4 font-bold">
                        FCFA{" "}
                        {Number(
                          loan.total_expected_repayment || 0
                        ).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {loan.status?.replace("_", " ").toUpperCase()}
                      </td>
                      <td className="py-4">
                        {loan.created_at
                          ? new Date(loan.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-4">
                        {loan.status !== "active" && canManageLoans ? (
                          <Button
                            onClick={() => activateLoan(loan)}
                            className="px-4 py-2"
                          >
                            Activate
                          </Button>
                        ) : (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Daily Repayment Collections
          </h2>

          {loadingLoanRepayments ? (
            <p className="mt-6 font-semibold text-slate-600">
              Loading repayments...
            </p>
          ) : loanRepayments.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No repayment schedules found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { label: "All", value: "all" },
                  { label: "Due Today", value: "due_today" },
                  { label: "Overdue", value: "overdue" },
                  { label: "Pending", value: "pending" },
                  { label: "Partial", value: "partial" },
                  { label: "Paid", value: "paid" },
                  { label: "Missed", value: "missed" },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    onClick={() => setRepaymentFilter(filter.value as any)}
                    variant={
                      repaymentFilter === filter.value ? "default" : "outline"
                    }
                    className="px-3 py-1 text-sm"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Due Date</th>
                    <th className="py-4">Expected</th>
                    <th className="py-4">Paid</th>
                    <th className="py-4">Balance</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRepayments.map((repayment) => (
                    <tr key={repayment.id} className="border-b">
                      <td className="py-4">
                        {new Date(repayment.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-bold">
                        FCFA{" "}
                        {Number(
                          repayment.expected_amount || 0
                        ).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA{" "}
                        {Number(repayment.paid_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA{" "}
                        {Number(
                          repayment.balance_remaining || 0
                        ).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {repayment.payment_status?.toUpperCase()}
                      </td>
                      <td className="py-4">
                        {canManageLoans ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              placeholder="Paid amount"
                              className="w-28 rounded-lg border px-2 py-1 text-sm"
                              value={
                                repaymentInputs[repayment.id]?.paid_amount || ""
                              }
                              onChange={(e) =>
                                setRepaymentInputs({
                                  ...repaymentInputs,
                                  [repayment.id]: {
                                    ...repaymentInputs[repayment.id],
                                    paid_amount: e.target.value,
                                  },
                                })
                              }
                            />

                            <select
                              className="rounded-lg border px-2 py-1 text-sm"
                              value={
                                repaymentInputs[repayment.id]?.payment_method ||
                                ""
                              }
                              onChange={(e) =>
                                setRepaymentInputs({
                                  ...repaymentInputs,
                                  [repayment.id]: {
                                    ...repaymentInputs[repayment.id],
                                    payment_method: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">Method</option>
                              <option value="cash">Cash</option>
                              <option value="momo">Mobile Money</option>
                              <option value="bank">Bank</option>
                              <option value="transfer">Transfer</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Reference"
                              className="w-32 rounded-lg border px-2 py-1 text-sm"
                              value={
                                repaymentInputs[repayment.id]?.reference || ""
                              }
                              onChange={(e) =>
                                setRepaymentInputs({
                                  ...repaymentInputs,
                                  [repayment.id]: {
                                    ...repaymentInputs[repayment.id],
                                    reference: e.target.value,
                                  },
                                })
                              }
                            />

                            <input
                              type="text"
                              placeholder="Notes"
                              className="w-40 rounded-lg border px-2 py-1 text-sm"
                              value={repaymentInputs[repayment.id]?.notes || ""}
                              onChange={(e) =>
                                setRepaymentInputs({
                                  ...repaymentInputs,
                                  [repayment.id]: {
                                    ...repaymentInputs[repayment.id],
                                    notes: e.target.value,
                                  },
                                })
                              }
                            />

                            <Button
                              onClick={() =>
                                updateRepayment(repayment.id, {
                                  paid_amount: Number(
                                    repaymentInputs[repayment.id]
                                      ?.paid_amount || 0
                                  ),
                                  payment_method:
                                    repaymentInputs[repayment.id]
                                      ?.payment_method || undefined,
                                  reference:
                                    repaymentInputs[repayment.id]?.reference ||
                                    undefined,
                                  notes:
                                    repaymentInputs[repayment.id]?.notes ||
                                    undefined,
                                })
                              }
                              className="px-4 py-1"
                            >
                              Record
                            </Button>

                            <Button
                              onClick={() =>
                                updateRepayment(repayment.id, {
                                  paid_amount: 0,
                                  payment_status: "missed",
                                })
                              }
                              className="bg-red-600 px-4 py-1 hover:bg-red-700"
                            >
                              Missed
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">
                            No access
                          </span>
                        )}
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