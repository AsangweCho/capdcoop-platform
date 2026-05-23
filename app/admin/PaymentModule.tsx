"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  member_number: string | null;
  total_shares: number | null;
  portfolio_value: number | null;
  registered_by_agent_id: string | null;
};

type Payment = {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  payment_type: string;
  reference: string | null;
  receipt_path: string | null;
  created_at: string;
  members?: Member;
  registered_by_agent_id: string | null;
total_shares: number | null;
portfolio_value: number | null;
};

interface PaymentModuleProps {
  currentAdmin: any;
}

const SHARE_PRICE = 10000;

export default function PaymentModule({
  currentAdmin,
}: PaymentModuleProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [approvingId, setApprovingId] = useState("");

  const [message, setMessage] = useState("");

  const [creatingPayment, setCreatingPayment] = useState(false);

  const [newPaymentMemberId, setNewPaymentMemberId] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("cash");
  const [newPaymentType, setNewPaymentType] = useState("share_purchase");
  const [newPaymentReference, setNewPaymentReference] = useState("");
  const [newPaymentReceipt, setNewPaymentReceipt] =
    useState<File | null>(null);

  const canManagePayments =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "finance";

  async function loadPayments() {
    setLoadingPayments(true);

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
members (
  id,
  full_name,
  email,
  member_number,
  total_shares,
  portfolio_value
)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Failed to load payments.");
      setPayments([]);
    } else {
      setPayments(data || []);
    }

    setLoadingPayments(false);
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("*")
     .eq("membership_status", "active")
      .order("full_name");

    if (error) {
      console.error(error);
      return;
    }

    setMembers(data || []);
  }

  useEffect(() => {
    loadPayments();
    loadMembers();
  }, []);

  async function createPayment() {
    if (!newPaymentMemberId || !newPaymentAmount) {
      setMessage("Please complete all required fields.");
      return;
    }

    setCreatingPayment(true);

    let receiptPath: string | null = null;

    try {
      if (newPaymentReceipt) {
        const fileExt = newPaymentReceipt.name.split(".").pop();

        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(fileName, newPaymentReceipt);

        if (uploadError) {
          console.error(uploadError);
          setMessage("Receipt upload failed.");
          setCreatingPayment(false);
          return;
        }

        receiptPath = fileName;
      }

      const { data, error } = await supabase
        .from("payments")
        .insert({
          member_id: newPaymentMemberId,
          amount: Number(newPaymentAmount),
          payment_method: newPaymentMethod,
          payment_type: newPaymentType,
          payment_status: "pending",
          reference: newPaymentReference || null,
          receipt_path: receiptPath,
        })
        .select(`
          *,
          members (
            id,
            full_name,
            email,
            member_number,
            total_shares,
            portfolio_value
          )
        `)
        .single();

      if (error) {
        console.error(error);
        setMessage(error.message);
      } else {
        setPayments((prev) => [data, ...prev]);

        setMessage("Payment created successfully.");

        setNewPaymentMemberId("");
        setNewPaymentAmount("");
        setNewPaymentMethod("cash");
        setNewPaymentType("share_purchase");
        setNewPaymentReference("");
        setNewPaymentReceipt(null);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error occurred.");
    }

    setCreatingPayment(false);
  }

async function approvePayment(payment: Payment) {
  if (!canManagePayments) return;

  setApprovingId(payment.id);

  try {
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "approved",
      })
      .eq("id", payment.id);

    if (error) {
      console.error(error);
      setMessage("Failed to approve payment.");
      setApprovingId("");
      return;
    }

    const member = payment.members;

    // SHARE PURCHASE LOGIC
    if (payment.payment_type === "share_purchase" && member) {
      const sharesBought = Math.floor(Number(payment.amount) / SHARE_PRICE);

      const updatedShares =
        Number(member.total_shares || 0) + sharesBought;

      const updatedPortfolio =
        Number(member.portfolio_value || 0) + Number(payment.amount);

      const { error: memberError } = await supabase
        .from("members")
        .update({
          total_shares: updatedShares,
          portfolio_value: updatedPortfolio,
        })
        .eq("id", member.id);

      if (memberError) {
        console.error(memberError);
        setMessage(memberError.message);
        setApprovingId("");
        return;
      }
    }

    // AGENT COMMISSION LOGIC
    if (member?.registered_by_agent_id) {
      const { data: existingCommission, error: existingCommissionError } =
        await supabase
          .from("agent_commissions")
          .select("id")
          .eq("payment_id", payment.id)
          .maybeSingle();

      if (existingCommissionError) {
        console.error(existingCommissionError);
      }

      if (!existingCommission) {
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("id, commission_rate, status")
          .eq("id", member.registered_by_agent_id)
          .maybeSingle();

        if (agentError) {
          console.error(agentError);
        }

        if (agentData && agentData.status === "active") {
          const rate = Number(agentData.commission_rate || 10);
          const baseAmount = Number(payment.amount || 0);
          const commissionAmount = baseAmount * (rate / 100);

          const { error: commissionError } = await supabase
            .from("agent_commissions")
            .insert({
              agent_id: agentData.id,
              member_id: member.id,
              payment_id: payment.id,
              commission_type:
                payment.payment_type === "share_purchase"
                  ? "share_purchase"
                  : "registration",
              base_amount: baseAmount,
              commission_rate: rate,
              commission_amount: commissionAmount,
              status: "pending",
            });

          if (commissionError) {
            console.error(commissionError);
            setMessage(
              "Payment approved, but commission could not be created."
            );
          }
        }
      }
    }

    setPayments((prev) =>
      prev.map((p) =>
        p.id === payment.id
          ? {
              ...p,
              payment_status: "approved",
            }
          : p
      )
    );

    setMessage("Payment approved successfully.");
  } catch (err) {
    console.error(err);
    setMessage("Unexpected approval error.");
  }

  setApprovingId("");
}

async function openReceipt(path: string) {
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(path, 120);

  if (error || !data?.signedUrl) {
    console.error(error);
    setMessage(error?.message || "Could not open receipt.");
    return;
  }

  window.open(data.signedUrl, "_blank");
}

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-3xl font-black text-[#0D2D6E]">
          Payment Validation Queue
        </h2>

        {message && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            {message}
          </div>
        )}

        {canManagePayments && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-xl font-black text-[#0D2D6E]">
              Add Payment
            </h3>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <select
                value={newPaymentMemberId}
                onChange={(e) =>
                  setNewPaymentMemberId(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="">Select Member</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.member_number})
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Amount"
                value={newPaymentAmount}
                onChange={(e) =>
                  setNewPaymentAmount(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />

              <select
                value={newPaymentType}
                onChange={(e) =>
                  setNewPaymentType(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="share_purchase">
                  Share Purchase
                </option>

                <option value="loan_repayment">
                  Loan Repayment
                </option>

                <option value="registration">
                  Registration
                </option>

                <option value="savings">
                  Savings
                </option>

                <option value="other">
                  Other
                </option>
              </select>

              <select
                value={newPaymentMethod}
                onChange={(e) =>
                  setNewPaymentMethod(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="cash">Cash</option>
                <option value="momo">Mobile Money</option>
                <option value="bank">Bank Transfer</option>
                <option value="card">Card Payment</option>
              </select>

              <input
                type="text"
                placeholder="Reference"
                value={newPaymentReference}
                onChange={(e) =>
                  setNewPaymentReference(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />

              <input
                type="file"
                onChange={(e) =>
                  setNewPaymentReceipt(
                    e.target.files?.[0] || null
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              />
            </div>

            <Button
              onClick={createPayment}
              disabled={creatingPayment}
              className="mt-6"
            >
              {creatingPayment
                ? "Creating..."
                : "Create Payment"}
            </Button>
          </div>
        )}

        {loadingPayments ? (
          <p className="mt-6">Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="mt-6">No payments found.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Member</th>
                  <th className="py-4">Email</th>
                  <th className="py-4">Type</th>
                  <th className="py-4">Amount</th>
                  <th className="py-4">Method</th>
                  <th className="py-4">Reference</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Receipt</th>
                  <th className="py-4">Date</th>
                  <th className="py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {payment.members?.full_name || "Unknown"}
                    </td>

                    <td className="py-4">
                      {payment.members?.email || "-"}
                    </td>

                    <td className="py-4">
                      {payment.payment_type}
                    </td>

                    <td className="py-4 font-bold">
                      FCFA{" "}
                      {Number(payment.amount).toLocaleString()}
                    </td>

                    <td className="py-4">
                      {payment.payment_method}
                    </td>

                    <td className="py-4">
                      {payment.reference || "-"}
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          payment.payment_status ===
                          "approved"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {payment.payment_status}
                      </span>
                    </td>

                    <td className="py-4">
                      {payment.receipt_path ? (
                        <Button
                          onClick={() =>
                            openReceipt(
                              payment.receipt_path!
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="py-4">
                      {new Date(
                        payment.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="py-4">
                      {payment.payment_status ===
                      "pending" ? (
                        <Button
                          onClick={() =>
                            approvePayment(payment)
                          }
                          disabled={
                            approvingId === payment.id
                          }
                        >
                          {approvingId === payment.id
                            ? "Approving..."
                            : "Approve"}
                        </Button>
                      ) : (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          Approved
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
  );
}