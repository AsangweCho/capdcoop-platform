"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MemberOption = {
  id: string;
  full_name: string;
  member_number: string | null;
};

type Loan = {
  id: string;
  loan_number?: string | null;
  member_id: string | null;
  business_name: string | null;
  loan_amount: number;
  duration_days: number;
  insurance_fee: number | null;
  registration_fee: number | null;
  total_interest: number | null;
  daily_payment_amount: number | null;
  total_expected_repayment: number | null;
  amount_repaid: number | null;
  outstanding_balance: number | null;
  purpose: string | null;
  status: string;
  start_date: string | null;
  created_at: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
  last_payment_date: string | null;
  rejected_at?: string | null;
  rejection_reason: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  edit_reason?: string | null;
  members?:
    | {
        full_name: string;
        member_number: string | null;
      }
    | {
        full_name: string;
        member_number: string | null;
      }[]
    | null;
};

type NewLoanState = {
  member_id: string;
  business_name: string;
  loan_amount: string;
  duration_days: string;
  purpose: string;
};

type EditLoanState = {
  member_id: string;
  business_name: string;
  loan_amount: string;
  duration_days: string;
  purpose: string;
  status: string;
  reason: string;
};

type RepaymentScheduleRow = {
  id: string;
  loan_id: string;
  member_id: string | null;
  installment_number: number;
  due_date: string;
  expected_amount: number;
  paid_amount: number | null;
  arrears_amount: number | null;
  status: string;
};

const INSURANCE_RATE = 0.025;
const REGISTRATION_FEE = 5000;
const INTEREST_RATE_PER_30_DAYS = 0.03;

const emptyNewLoan: NewLoanState = {
  member_id: "",
  business_name: "",
  loan_amount: "",
  duration_days: "",
  purpose: "",
};

const emptyEditLoan: EditLoanState = {
  member_id: "",
  business_name: "",
  loan_amount: "",
  duration_days: "",
  purpose: "",
  status: "pending",
  reason: "",
};

export default function LoanModule({ currentAdmin }: { currentAdmin: any }) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedLoanSchedule, setSelectedLoanSchedule] = useState<
    RepaymentScheduleRow[]
  >([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");

  const [actionLoanId, setActionLoanId] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editLoan, setEditLoan] = useState<EditLoanState>(emptyEditLoan);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newLoan, setNewLoan] = useState<NewLoanState>(emptyNewLoan);

  const adminRole = String(currentAdmin?.role || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isSuperAdmin = adminRole === "super_admin";

  const canManageLoans = ["super_admin", "admin", "finance"].includes(
    adminRole
  );

  function calculateLoan(principalInput: number, durationInput: number) {
    const principal = Number(principalInput || 0);
    const durationDays = Number(durationInput || 0);

    const insuranceFee = principal * INSURANCE_RATE;
    const registrationFee = REGISTRATION_FEE;
    const interestPeriods = Math.floor(durationDays / 30);
    const interestPerPeriod = principal * INTEREST_RATE_PER_30_DAYS;
    const totalInterest = interestPeriods * interestPerPeriod;

    const totalExpectedRepayment =
      principal + insuranceFee + registrationFee + totalInterest;

    const dailyPaymentAmount =
      durationDays > 0 ? totalExpectedRepayment / durationDays : 0;

    return {
      insuranceFee,
      registrationFee,
      interestPeriods,
      totalInterest,
      totalExpectedRepayment,
      dailyPaymentAmount,
    };
  }

  const preview = useMemo(() => {
    return calculateLoan(
      Number(newLoan.loan_amount || 0),
      Number(newLoan.duration_days || 0)
    );
  }, [newLoan.loan_amount, newLoan.duration_days]);

  const editPreview = useMemo(() => {
    return calculateLoan(
      Number(editLoan.loan_amount || 0),
      Number(editLoan.duration_days || 0)
    );
  }, [editLoan.loan_amount, editLoan.duration_days]);

  useEffect(() => {
    loadMembers();
    loadLoans();
  }, []);

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, member_number")
      .eq("membership_status", "active")
      .order("full_name", { ascending: true });

    if (error) {
      setMessage(error.message || "Failed to load members.");
      return;
    }

    setMembers((data as MemberOption[]) || []);
  }

  async function loadLoans() {
    setLoadingLoans(true);

    const { data, error } = await supabase
      .from("loans")
      .select(
        `
        *,
        members (
          full_name,
          member_number
        )
      `
      )
      .or("is_deleted.is.null,is_deleted.eq.false")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Failed to load loans.");
      setLoans([]);
      setLoadingLoans(false);
      return;
    }

    setLoans((data as unknown as Loan[]) || []);
    setLoadingLoans(false);
  }

  function getMemberName(loan: Loan) {
    if (Array.isArray(loan.members)) {
      return loan.members[0]?.full_name || "-";
    }

    return loan.members?.full_name || "-";
  }

  function getMemberNumber(loan: Loan) {
    if (Array.isArray(loan.members)) {
      return loan.members[0]?.member_number || "";
    }

    return loan.members?.member_number || "";
  }

  async function createLoan() {
    if (!canManageLoans) {
      setMessage("You do not have permission to create aid records.");
      return;
    }

    if (!newLoan.member_id || !newLoan.loan_amount || !newLoan.duration_days) {
     setMessage("Please select a member, enter aid amount, and duration.");
      return;
    }

    const principal = Number(newLoan.loan_amount);
    const durationDays = Number(newLoan.duration_days);

    if (Number.isNaN(principal) || principal <= 0) {
      setMessage("Aid amount must be greater than zero.");
      return;
    }

    if (Number.isNaN(durationDays) || durationDays <= 0) {
      setMessage("Duration must be greater than zero.");
      return;
    }

    const computed = calculateLoan(principal, durationDays);

    setCreatingLoan(true);
    setMessage("");

    const { count, error: countError } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true });

    if (countError) {
      setMessage(countError.message);
      setCreatingLoan(false);
      return;
    }

    const nextLoanNumber = `CAPD-LOAN-${String((count || 0) + 1).padStart(
      5,
      "0"
    )}`;

    const { error } = await supabase.from("loans").insert({
      loan_number: nextLoanNumber,
      member_id: newLoan.member_id,
      business_name: newLoan.business_name.trim() || null,
      loan_amount: principal,
      duration_days: durationDays,
      insurance_fee: computed.insuranceFee,
      registration_fee: computed.registrationFee,
      total_interest: computed.totalInterest,
      daily_payment_amount: computed.dailyPaymentAmount,
      total_expected_repayment: computed.totalExpectedRepayment,
      amount_repaid: 0,
      outstanding_balance: computed.totalExpectedRepayment,
      purpose: newLoan.purpose.trim() || null,
      status: "pending",
      created_by: currentAdmin?.id || null,
      is_deleted: false,
    });

    if (error) {
      setMessage(error.message || "Failed to create aid record.");
      setCreatingLoan(false);
      return;
    }

    setMessage("Aid record created and sent for approval.");
    setNewLoan(emptyNewLoan);

    await loadLoans();
    setCreatingLoan(false);
  }

  async function loadLoanSchedule(loanId: string) {
    const { data, error } = await supabase
      .from("loan_repayment_schedule")
      .select("*")
      .eq("loan_id", loanId)
      .order("due_date", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedLoanId(loanId);
    setSelectedLoanSchedule((data as RepaymentScheduleRow[]) || []);

    if (!data || data.length === 0) {
    setMessage("No repayment schedule found for this aid record yet.");
    }
  }

  async function approveLoan(loan: Loan) {
    if (!canManageLoans) return;

    const confirmed = window.confirm("Approve this aid record?");
    if (!confirmed) return;

    setActionLoanId(loan.id);

    const { error } = await supabase
      .from("loans")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: currentAdmin?.id || null,
      })
      .eq("id", loan.id);

    setActionLoanId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Aid record approved successfully.");
    await loadLoans();
  }

  async function disburseLoan(loan: Loan) {
    if (!canManageLoans) return;

    const confirmed = window.confirm(
      "Confirm that this aid record has been disbursed and should become active?"
    );

    if (!confirmed) return;

    setActionLoanId(loan.id);

    const startDate = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("loans")
      .update({
        status: "active",
        start_date: loan.start_date || startDate,
        disbursed_at: new Date().toISOString(),
        disbursed_by: currentAdmin?.id || null,
        outstanding_balance:
          Number(loan.outstanding_balance || 0) > 0
            ? Number(loan.outstanding_balance || 0)
            : Number(loan.total_expected_repayment || 0),
      })
      .eq("id", loan.id);

    if (error) {
      setMessage(error.message);
      setActionLoanId(null);
      return;
    }

    const dailyAmount = Number(loan.daily_payment_amount || 0);
    const durationDays = Number(loan.duration_days || 0);
    const memberId = loan.member_id;

    if (memberId && dailyAmount > 0 && durationDays > 0) {
      const { data: existingSchedule, error: existingScheduleError } =
        await supabase
          .from("loan_repayment_schedule")
          .select("id")
          .eq("loan_id", loan.id)
          .limit(1);

      if (existingScheduleError) {
        setMessage(existingScheduleError.message);
        setActionLoanId(null);
        return;
      }

      if (!existingSchedule || existingSchedule.length === 0) {
        const start = loan.start_date ? new Date(loan.start_date) : new Date();

        const scheduleRows = Array.from({ length: durationDays }, (_, index) => {
          const dueDate = new Date(start);
          dueDate.setDate(start.getDate() + index);

          return {
            loan_id: loan.id,
            member_id: memberId,
            installment_number: index + 1,
            due_date: dueDate.toISOString().slice(0, 10),
            expected_amount: dailyAmount,
            paid_amount: 0,
            arrears_amount: dailyAmount,
            status: "pending",
          };
        });

        const { error: scheduleError } = await supabase
          .from("loan_repayment_schedule")
          .insert(scheduleRows);

        if (scheduleError) {
          setMessage(scheduleError.message);
          setActionLoanId(null);
          return;
        }
      }
    }

    setActionLoanId(null);
    setMessage("Aid disbursed, activated, and repayment schedule generated.");
    await loadLoans();
  }

  async function rejectLoan(loan: Loan) {
    if (!canManageLoans) return;

   const reason = window.prompt("Reason for rejecting this aid record?");
    if (reason === null) return;

    setActionLoanId(loan.id);

    const { error } = await supabase
      .from("loans")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || "No reason provided",
      })
      .eq("id", loan.id);

    setActionLoanId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

  setMessage("Aid record rejected.");
    await loadLoans();
  }

  async function closeLoan(loan: Loan) {
    if (!canManageLoans) return;

    const confirmed = window.confirm("Close this aid record manually?");
    if (!confirmed) return;

    setActionLoanId(loan.id);

    const { error } = await supabase
      .from("loans")
      .update({
        status: "closed",
        outstanding_balance: 0,
        updated_at: new Date().toISOString(),
        updated_by: currentAdmin?.id || null,
      })
      .eq("id", loan.id);

    setActionLoanId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Aid record closed.");
    await loadLoans();
  }

  function openEditLoanModal(loan: Loan) {
    if (!isSuperAdmin) {
      setMessage("Only a Super Admin can edit aid records.");
      return;
    }

    setEditingLoan(loan);
    setEditLoan({
      member_id: loan.member_id || "",
      business_name: loan.business_name || "",
      loan_amount: String(loan.loan_amount || ""),
      duration_days: String(loan.duration_days || ""),
      purpose: loan.purpose || "",
      status: loan.status || "pending",
      reason: "",
    });
  }

  function closeEditLoanModal() {
    setEditingLoan(null);
    setEditLoan(emptyEditLoan);
    setSavingEdit(false);
  }

  async function updateLoan() {
    if (!isSuperAdmin) {
      setMessage("Only a Super Admin can edit aid records.");
      return;
    }

    if (!editingLoan) return;

    if (!editLoan.member_id) {
      setMessage("Please select a member for this aid record.");
      return;
    }

    const principal = Number(editLoan.loan_amount || 0);
    const durationDays = Number(editLoan.duration_days || 0);
    const reason = editLoan.reason.trim();

    if (Number.isNaN(principal) || principal <= 0) {
      setMessage("Aid amount must be greater than zero.");
      return;
    }

    if (Number.isNaN(durationDays) || durationDays <= 0) {
      setMessage("Duration must be greater than zero.");
      return;
    }

    if (!reason) {
      setMessage("Please enter a reason for editing this aid record.");
      return;
    }

    const principalChanged = principal !== Number(editingLoan.loan_amount || 0);
    const durationChanged =
      durationDays !== Number(editingLoan.duration_days || 0);
    const financialFieldsChanged = principalChanged || durationChanged;

    if (
      financialFieldsChanged &&
      ["active", "closed"].includes(editingLoan.status)
    ) {
      const confirmed = window.confirm(
        "This aid record is already active or closed. Editing principal or duration will update the aid totals, but it will not automatically rebuild paid repayment history. Continue?"
      );

      if (!confirmed) return;
    }

    const computed = calculateLoan(principal, durationDays);
    const amountRepaid = Number(editingLoan.amount_repaid || 0);
    const recalculatedOutstanding = Math.max(
      computed.totalExpectedRepayment - amountRepaid,
      0
    );

    const selectedStatus = editLoan.status || editingLoan.status || "pending";
    const finalOutstanding =
      selectedStatus === "closed" ? 0 : recalculatedOutstanding;

    const now = new Date().toISOString();
    const memberCanBeChanged = !["active", "closed"].includes(
      editingLoan.status
    );

    const updatePayload: Record<string, any> = {
      business_name: editLoan.business_name.trim() || null,
      loan_amount: principal,
      duration_days: durationDays,
      insurance_fee: computed.insuranceFee,
      registration_fee: computed.registrationFee,
      total_interest: computed.totalInterest,
      daily_payment_amount: computed.dailyPaymentAmount,
      total_expected_repayment: computed.totalExpectedRepayment,
      outstanding_balance: finalOutstanding,
      purpose: editLoan.purpose.trim() || null,
      status: selectedStatus,
      edit_reason: reason,
      updated_at: now,
      updated_by: currentAdmin?.id || null,
    };

    if (memberCanBeChanged) {
      updatePayload.member_id = editLoan.member_id;
    }

    if (selectedStatus === "approved" && !editingLoan.approved_at) {
      updatePayload.approved_at = now;
      updatePayload.approved_by = currentAdmin?.id || null;
    }

    if (selectedStatus === "rejected") {
      updatePayload.rejection_reason = reason;

      if (!editingLoan.rejected_at) {
        updatePayload.rejected_at = now;
      }
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("loans")
      .update(updatePayload)
      .eq("id", editingLoan.id);

    if (error) {
      setMessage(error.message || "Failed to update aid record.");
      setSavingEdit(false);
      return;
    }

    const { error: auditError } = await supabase.from("loan_audit_logs").insert({
      loan_id: editingLoan.id,
      action: "edited",
      old_data: editingLoan,
      new_data: updatePayload,
      reason,
      performed_by: currentAdmin?.id || null,
    });

    closeEditLoanModal();
    await loadLoans();

    if (auditError) {
      setMessage(
        `Aid record updated successfully, but audit log was not saved: ${auditError.message}`
      );
      return;
    }

    setMessage("Aid record updated successfully.");
  }

  async function deleteLoan(loan: Loan) {
    if (!isSuperAdmin) {
      setMessage("Only a Super Admin can delete aid records.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this aid record? It will be hidden from the Aid Management table but kept in the database for audit history."
    );

    if (!confirmed) return;

    if (Number(loan.amount_repaid || 0) > 0) {
      const financialConfirm = window.confirm(
        "This aid record already has repayments recorded. Deleting it will hide it from the table, but the audit history will remain. Continue?"
      );

      if (!financialConfirm) return;
    }

    const reason = window.prompt("Reason for deleting this aid record?");

    if (!reason || !reason.trim()) {
      setMessage("Delete reason is required.");
      return;
    }

    const now = new Date().toISOString();

    const deletePayload = {
      is_deleted: true,
      deleted_at: now,
      deleted_by: currentAdmin?.id || null,
      edit_reason: reason.trim(),
      updated_at: now,
      updated_by: currentAdmin?.id || null,
    };

    setActionLoanId(loan.id);

    const { error } = await supabase
      .from("loans")
      .update(deletePayload)
      .eq("id", loan.id);

    if (error) {
      setMessage(error.message || "Failed to delete aid record.");
      setActionLoanId(null);
      return;
    }

    const { error: auditError } = await supabase.from("loan_audit_logs").insert({
      loan_id: loan.id,
      action: "deleted",
      old_data: loan,
      new_data: deletePayload,
      reason: reason.trim(),
      performed_by: currentAdmin?.id || null,
    });

    if (selectedLoanId === loan.id) {
      setSelectedLoanId("");
      setSelectedLoanSchedule([]);
    }

    setActionLoanId(null);
    await loadLoans();

    if (auditError) {
      setMessage(
        `Aid record deleted successfully, but audit log was not saved: ${auditError.message}`
      );
      return;
    }

    setMessage("Aid record deleted successfully.");
  }

  function statusStyle(status: string) {
    if (status === "active") return "bg-green-50 text-green-700";
    if (status === "approved") return "bg-blue-50 text-blue-700";
    if (status === "pending") return "bg-amber-50 text-amber-700";
    if (status === "closed") return "bg-slate-100 text-slate-700";
    if (status === "rejected") return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-700";
  }

  const loanStats = useMemo(() => {
    const activeLoans = loans.filter((loan) => loan.status === "active");
    const pendingLoans = loans.filter((loan) => loan.status === "pending");
    const approvedLoans = loans.filter((loan) => loan.status === "approved");

    const totalPrincipal = loans.reduce(
      (sum, loan) => sum + Number(loan.loan_amount || 0),
      0
    );

    const totalOutstanding = loans
      .filter((loan) => loan.status === "active")
      .reduce((sum, loan) => sum + Number(loan.outstanding_balance || 0), 0);

    const totalRepaid = loans.reduce(
      (sum, loan) => sum + Number(loan.amount_repaid || 0),
      0
    );

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      pendingLoans: pendingLoans.length,
      approvedLoans: approvedLoans.length,
      totalPrincipal,
      totalOutstanding,
      totalRepaid,
    };
  }, [loans]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Aid Records" value={loanStats.totalLoans.toString()} />
        <MetricCard
          title="Pending Review"
          value={loanStats.pendingLoans.toString()}
        />
        <MetricCard
          title="Approved Awaiting Disbursement"
          value={loanStats.approvedLoans.toString()}
        />
        <MetricCard title="Active Aid Records" value={loanStats.activeLoans.toString()} />
        <MetricCard
          title="Principal Created"
          value={`FCFA ${loanStats.totalPrincipal.toLocaleString()}`}
        />
        <MetricCard
          title="Amount Repaid"
          value={`FCFA ${loanStats.totalRepaid.toLocaleString()}`}
        />
        <MetricCard
          title="Outstanding Balance"
          value={`FCFA ${loanStats.totalOutstanding.toLocaleString()}`}
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
           Create New Aid Record
          </h2>

          {message && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {message}
            </div>
          )}

          {canManageLoans ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <select
                value={newLoan.member_id}
                onChange={(e) =>
                  setNewLoan({ ...newLoan, member_id: e.target.value })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.member_number || "No Number"})
                  </option>
                ))}
              </select>

              <input
                value={newLoan.business_name}
                onChange={(e) =>
                  setNewLoan({ ...newLoan, business_name: e.target.value })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Business name"
              />

              <input
                type="number"
                value={newLoan.loan_amount}
                onChange={(e) =>
                  setNewLoan({ ...newLoan, loan_amount: e.target.value })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Aid amount"
              />

              <input
                type="number"
                value={newLoan.duration_days}
                onChange={(e) =>
                  setNewLoan({ ...newLoan, duration_days: e.target.value })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Duration in days"
              />

              <input
                value={newLoan.purpose}
                onChange={(e) =>
                  setNewLoan({ ...newLoan, purpose: e.target.value })
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none md:col-span-2"
                placeholder="Purpose of aid"
              />
            </div>
          ) : (
            <p className="mt-6 font-semibold text-slate-600">
             You do not have permission to create aid records.
            </p>
          )}

          <div className="mt-6 rounded-3xl bg-slate-50 p-6">
            <p className="text-sm font-black uppercase tracking-widest text-slate-500">
              Aid Computation Preview
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-5">
              <PreviewItem
                label="Insurance"
                value={`FCFA ${preview.insuranceFee.toLocaleString()}`}
              />
              <PreviewItem
                label="Registration"
                value={`FCFA ${preview.registrationFee.toLocaleString()}`}
              />
              <PreviewItem
                label="Interest"
                value={`FCFA ${preview.totalInterest.toLocaleString()}`}
              />
              <PreviewItem
                label="Total Repayment"
                value={`FCFA ${preview.totalExpectedRepayment.toLocaleString()}`}
              />
              <PreviewItem
                label="Daily Payment"
                value={`FCFA ${preview.dailyPaymentAmount.toLocaleString(
                  undefined,
                  { maximumFractionDigits: 0 }
                )}`}
              />
            </div>
          </div>

          <Button
            onClick={createLoan}
            disabled={creatingLoan || !canManageLoans}
            className="mt-6 px-6 py-3"
          >
            {creatingLoan ? "Creating..." : "Create Aid"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#0D2D6E]">
                Aid Management
              </h2>
              {isSuperAdmin && (
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Super Admin controls are enabled: Edit and Delete are available.
                </p>
              )}
            </div>
          </div>

          {loadingLoans ? (
            <p className="mt-6 font-semibold text-slate-600">
              Loading aid records...
            </p>
          ) : loans.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No aid records created yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1850px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Member</th>
                    <th className="py-4">Business</th>
                    <th className="py-4">Principal</th>
                    <th className="py-4">Total Repayment</th>
                    <th className="py-4">Repaid</th>
                    <th className="py-4">Outstanding</th>
                    <th className="py-4">Daily</th>
                    <th className="py-4">Duration</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Created</th>
                    <th className="py-4">Approved</th>
                    <th className="py-4">Disbursed</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loans.map((loan) => {
                    const isWorking = actionLoanId === loan.id;

                    return (
                      <tr key={loan.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {getMemberName(loan)}
                          <span className="block text-xs text-slate-500">
                            {getMemberNumber(loan)}
                          </span>
                        </td>

                        <td className="py-4">{loan.business_name || "-"}</td>

                        <td className="py-4 font-bold">
                          FCFA {Number(loan.loan_amount || 0).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(
                            loan.total_expected_repayment || 0
                          ).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(loan.amount_repaid || 0).toLocaleString()}
                        </td>

                        <td className="py-4 font-black text-[#0D2D6E]">
                          FCFA{" "}
                          {Number(
                            loan.outstanding_balance || 0
                          ).toLocaleString()}
                        </td>

                        <td className="py-4">
                          FCFA{" "}
                          {Number(
                            loan.daily_payment_amount || 0
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>

                        <td className="py-4">{loan.duration_days} days</td>

                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                              loan.status
                            )}`}
                          >
                            {loan.status?.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-4 text-slate-600">
                          {loan.created_at
                            ? new Date(loan.created_at).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="py-4 text-slate-600">
                          {loan.approved_at
                            ? new Date(loan.approved_at).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="py-4 text-slate-600">
                          {loan.disbursed_at
                            ? new Date(loan.disbursed_at).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="py-4">
                          <div className="flex flex-wrap gap-2">
                            {loan.status === "pending" && (
                              <>
                                <Button
                                  onClick={() => approveLoan(loan)}
                                  disabled={!canManageLoans || isWorking}
                                  className="px-4 py-2"
                                >
                                  {isWorking ? "Working..." : "Approve"}
                                </Button>

                                <button
                                  onClick={() => rejectLoan(loan)}
                                  disabled={!canManageLoans || isWorking}
                                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {loan.status === "approved" && (
                              <Button
                                onClick={() => disburseLoan(loan)}
                                disabled={!canManageLoans || isWorking}
                                className="bg-[#009B5A] px-4 py-2 hover:opacity-90"
                              >
                                {isWorking ? "Working..." : "Disburse"}
                              </Button>
                            )}

                            <Button
                              onClick={() => loadLoanSchedule(loan.id)}
                              className="px-4 py-2"
                            >
                              View Schedule
                            </Button>

                            {loan.status === "active" && (
                              <Button
                                onClick={() => closeLoan(loan)}
                                disabled={!canManageLoans || isWorking}
                                className="px-4 py-2"
                              >
                                Close
                              </Button>
                            )}

                            {loan.status === "closed" && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Closed
                              </span>
                            )}

                            {loan.status === "rejected" && (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                Rejected
                              </span>
                            )}

                            {isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => openEditLoanModal(loan)}
                                  disabled={isWorking}
                                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => deleteLoan(loan)}
                                  disabled={isWorking}
                                  className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </>
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
        </CardContent>
      </Card>

      {selectedLoanId && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">
                  Repayment Schedule
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Showing {selectedLoanSchedule.length} scheduled repayment day(s).
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedLoanId("");
                  setSelectedLoanSchedule([]);
                }}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Close Schedule
              </button>
            </div>

            {selectedLoanSchedule.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No repayment schedule found for this aid record.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">No.</th>
                      <th className="py-4">Due Date</th>
                      <th className="py-4">Expected</th>
                      <th className="py-4">Paid</th>
                      <th className="py-4">Arrears</th>
                      <th className="py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedLoanSchedule.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {row.installment_number}
                        </td>

                        <td className="py-4">{row.due_date}</td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(row.expected_amount || 0).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA {Number(row.paid_amount || 0).toLocaleString()}
                        </td>

                        <td
                          className={
                            Number(row.arrears_amount || 0) > 0
                              ? "py-4 font-black text-red-600"
                              : "py-4 font-black text-green-700"
                          }
                        >
                          FCFA{" "}
                          {Number(row.arrears_amount || 0).toLocaleString()}
                        </td>

                        <td className="py-4 capitalize">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {editingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">
                  Edit Aid Record
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Changes are restricted to Super Admin and saved in the audit log.
                </p>
              </div>

              <button
                onClick={closeEditLoanModal}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Member
                </label>
                <select
                  value={editLoan.member_id}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, member_id: e.target.value })
                  }
                  disabled={["active", "closed"].includes(editingLoan.status)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.member_number || "No Number"})
                    </option>
                  ))}
                </select>
                {["active", "closed"].includes(editingLoan.status) && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Member cannot be changed for active or closed aid records.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Business Name
                </label>
                <input
                  value={editLoan.business_name}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, business_name: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Business name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Principal Amount
                </label>
                <input
                  type="number"
                  value={editLoan.loan_amount}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, loan_amount: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Aid amount"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Duration in Days
                </label>
                <input
                  type="number"
                  value={editLoan.duration_days}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, duration_days: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Duration in days"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Status
                </label>
                <select
                  value={editLoan.status}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, status: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Purpose
                </label>
                <input
                  value={editLoan.purpose}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, purpose: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Purpose of aid"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Reason for Edit
                </label>
                <textarea
                  value={editLoan.reason}
                  onChange={(e) =>
                    setEditLoan({ ...editLoan, reason: e.target.value })
                  }
                  className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Explain why this aid record is being edited"
                />
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-6">
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                Updated Computation Preview
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-5">
                <PreviewItem
                  label="Insurance"
                  value={`FCFA ${editPreview.insuranceFee.toLocaleString()}`}
                />
                <PreviewItem
                  label="Registration"
                  value={`FCFA ${editPreview.registrationFee.toLocaleString()}`}
                />
                <PreviewItem
                  label="Interest"
                  value={`FCFA ${editPreview.totalInterest.toLocaleString()}`}
                />
                <PreviewItem
                  label="Total Repayment"
                  value={`FCFA ${editPreview.totalExpectedRepayment.toLocaleString()}`}
                />
                <PreviewItem
                  label="Daily Payment"
                  value={`FCFA ${editPreview.dailyPaymentAmount.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )}`}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={updateLoan}
                disabled={savingEdit}
                className="px-6 py-3"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>

              <button
                onClick={closeEditLoanModal}
                disabled={savingEdit}
                className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-black text-[#0D2D6E]">{value}</p>
    </div>
  );
}
