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
  member_id: string | null;
  business_name: string | null;
  loan_amount: number;
  duration_days: number;
  insurance_fee: number | null;
  registration_fee: number | null;
  total_interest: number | null;
  daily_payment_amount: number | null;
  total_expected_repayment: number | null;
  purpose: string | null;
  status: string;
  start_date: string | null;
  created_at: string | null;
  members?: {
    full_name: string;
    member_number: string | null;
  }[] | null;
};

type NewLoanState = {
  member_id: string;
  business_name: string;
  loan_amount: string;
  duration_days: string;
  purpose: string;
};

const INSURANCE_RATE = 0.025;
const REGISTRATION_FEE = 5000;
const INTEREST_RATE_PER_30_DAYS = 0.03;

export default function LoanModule({ currentAdmin }: { currentAdmin: any }) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [message, setMessage] = useState("");

  const [newLoan, setNewLoan] = useState<NewLoanState>({
    member_id: "",
    business_name: "",
    loan_amount: "",
    duration_days: "",
    purpose: "",
  });

  const canManageLoans =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "finance";

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
      interestPerPeriod,
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

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, member_number")
      .eq("membership_status", "active")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to load members.");
      return;
    }

    setMembers((data as MemberOption[]) || []);
  }

  async function loadLoans() {
    setLoadingLoans(true);

    const { data, error } = await supabase
      .from("loans")
      .select(`
        *,
        members (
          full_name,
          member_number
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to load loans.");
      setLoans([]);
      setLoadingLoans(false);
      return;
    }

    setLoans((data as unknown as Loan[]) || []);
    setLoadingLoans(false);
  }

  useEffect(() => {
    loadMembers();
    loadLoans();
  }, []);

  async function createLoan() {
    if (!canManageLoans) {
      setMessage("You do not have permission to create loans.");
      return;
    }

    if (!newLoan.member_id || !newLoan.loan_amount || !newLoan.duration_days) {
      setMessage("Please select a member, enter loan amount, and duration.");
      return;
    }

    const principal = Number(newLoan.loan_amount);
    const durationDays = Number(newLoan.duration_days);

    const computed = calculateLoan(principal, durationDays);

    setCreatingLoan(true);
    setMessage("");

    const { data, error } = await supabase
      .from("loans")
      .insert({
        member_id: newLoan.member_id,
        business_name: newLoan.business_name || null,
        loan_amount: principal,
        duration_days: durationDays,
        insurance_fee: computed.insuranceFee,
        registration_fee: computed.registrationFee,
        total_interest: computed.totalInterest,
        daily_payment_amount: computed.dailyPaymentAmount,
        total_expected_repayment: computed.totalExpectedRepayment,
        purpose: newLoan.purpose || null,
        status: "draft",
        created_by: currentAdmin?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to create loan.");
      setCreatingLoan(false);
      return;
    }

    setMessage("Loan created successfully.");
    setNewLoan({
      member_id: "",
      business_name: "",
      loan_amount: "",
      duration_days: "",
      purpose: "",
    });

    await loadLoans();
    setCreatingLoan(false);
  }

  async function activateLoan(loan: Loan) {
    if (!canManageLoans) {
      setMessage("You do not have permission to activate loans.");
      return;
    }

    const startDate = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("loans")
      .update({
        status: "active",
        start_date: loan.start_date || startDate,
      })
      .eq("id", loan.id);

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to activate loan.");
      return;
    }

    setMessage("Loan activated successfully.");
    await loadLoans();
  }

  function getNextFiveRepaymentPreview(loan: Loan) {
    const start = loan.start_date ? new Date(loan.start_date) : new Date();
    const dailyAmount = Number(loan.daily_payment_amount || 0);
    const duration = Number(loan.duration_days || 0);

    return Array.from({ length: Math.min(5, duration) }, (_, index) => {
      const dueDate = new Date(start);
      dueDate.setDate(start.getDate() + index);

      return {
        day: index + 1,
        dueDate,
        expectedAmount: dailyAmount,
      };
    });
  }

  return (
    <div className="space-y-8">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Create New Loan
          </h2>
          {message && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {message}
            </div>
          )}

          {canManageLoans && (
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
                placeholder="Loan amount"
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
                placeholder="Purpose of loan"
              />
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-600">
              Loan Computation Preview:
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>Insurance: FCFA {preview.insuranceFee.toLocaleString()}</li>
              <li>Registration: FCFA {preview.registrationFee.toLocaleString()}</li>
              <li>Interest: FCFA {preview.totalInterest.toLocaleString()}</li>
              <li>Total repayment: FCFA {preview.totalExpectedRepayment.toLocaleString()}</li>
              <li>Daily Payment: FCFA {preview.dailyPaymentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
            </ul>
          </div>

          <Button
            onClick={createLoan}
            disabled={creatingLoan || !canManageLoans}
            className="mt-6 px-6 py-3"
          >
            {creatingLoan ? "Creating..." : "Create Loan"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Loan Management
          </h2>

          {loadingLoans ? (
            <p className="mt-6 font-semibold text-slate-600">Loading loans...</p>
          ) : loans.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">No loans created yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1350px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th>Member</th>
                    <th>Business</th>
                    <th>Principal</th>
                    <th>Insurance</th>
                    <th>Registration</th>
                    <th>Interest</th>
                    <th>Total</th>
                    <th>Daily</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {loan.members?.[0]?.full_name || "-"}
                      </td>
                      <td className="py-4">{loan.business_name || "-"}</td>
                      <td className="py-4">
                        FCFA {Number(loan.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.insurance_fee || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.registration_fee || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.total_interest || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.total_expected_repayment || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        FCFA {Number(loan.daily_payment_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-4">{loan.duration_days} days</td>
                      <td className="py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          loan.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {loan.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">
                        {loan.created_at ? new Date(loan.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-4">
                        {loan.status !== "active" ? (
                          <Button onClick={() => activateLoan(loan)} disabled={!canManageLoans} className="px-4 py-2">
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
          <h2 className="text-2xl font-black text-[#0D2D6E]">Next 5 Repayment Days Preview</h2>
          <p className="mt-2 text-sm text-slate-600">
            This is only a UI preview for field planning. No repayment schedule records are created yet.
          </p>

          <div className="mt-6 space-y-6">
            {loans.filter((loan) => loan.status === "active").map((loan) => (
              <div key={loan.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#0D2D6E]">
                      {loan.members?.[0]?.full_name || "Member"} · {loan.business_name || "Business"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Daily payment: FCFA {Number(loan.daily_payment_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                        <th className="py-3">Day</th>
                        <th className="py-3">Due Date</th>
                        <th className="py-3">Expected Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getNextFiveRepaymentPreview(loan).map((item) => (
                        <tr key={`${loan.id}-${item.day}`} className="border-b">
                          <td className="py-3 font-bold">Day {item.day}</td>
                          <td className="py-3">{item.dueDate.toLocaleDateString()}</td>
                          <td className="py-3 font-bold">
                            FCFA {Number(item.expectedAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {loans.filter((loan) => loan.status === "active").length === 0 && (
              <p className="font-semibold text-slate-600">No active loans available for preview.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}