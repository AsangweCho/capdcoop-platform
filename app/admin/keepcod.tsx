"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  payment_status: string;
  receipt_path: string | null;
  created_at: string;
  members:
    | {
        full_name: string;
        email: string;
      }
    | {
        full_name: string;
        email: string;
      }[]
    | null;
};

type MemberOption = {
  id: string;
  full_name: string;
  member_number: string | null;
};

export default function PaymentModule({ currentAdmin }: { currentAdmin: any }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [approvingId, setApprovingId] = useState("");
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState<MemberOption[]>([]);
const [newPaymentMemberId, setNewPaymentMemberId] = useState("");
const [newPaymentAmount, setNewPaymentAmount] = useState("");
const [newPaymentMethod, setNewPaymentMethod] = useState("cash");
const [newPaymentReference, setNewPaymentReference] = useState("");
const [newPaymentReceipt, setNewPaymentReceipt] = useState<File | null>(null);

const [creatingPayment, setCreatingPayment] = useState(false);

  const canManagePayments =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "finance";

    async function loadMembers() {
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, member_number")
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setMembers((data as MemberOption[]) || []);
}
  async function loadPayments() {
    setLoadingPayments(true);

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        member_id,
        amount,
        payment_method,
        reference,
        payment_status,
        receipt_path,
        created_at,
        members (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message || "Failed to load payments.");
      setPayments([]);
      setLoadingPayments(false);
      return;
    }

    setPayments((data as Payment[]) || []);
    setLoadingPayments(false);
  }

useEffect(() => {
  loadPayments();
  loadMembers();
}, []);

  async function openPaymentReceipt(receiptPath: string) {
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(receiptPath, 60);

    if (error || !data?.signedUrl) {
      console.error(error);
      setMessage("Could not open receipt.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

async function createPayment() {
  if (!canManagePayments) {
    setMessage("You do not have permission to add payments.");
    return;
  }

  if (!newPaymentMemberId || !newPaymentAmount) {
    setMessage("Member and amount are required.");
    return;
  }

  setCreatingPayment(true);
  setMessage("");

  let receiptPath: string | null = null;

  try {
    if (newPaymentReceipt) {
      const safeFileName = newPaymentReceipt.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      receiptPath = `${newPaymentMemberId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(receiptPath, newPaymentReceipt, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        member_id: newPaymentMemberId,
        amount: Number(newPaymentAmount),
        payment_method: newPaymentMethod,
        reference: newPaymentReference || null,
        receipt_path: receiptPath,
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabase.from("audit_logs").insert({
      actor_admin_id: currentAdmin?.id,
      actor_auth_user_id: currentAdmin?.auth_user_id,
      actor_email: currentAdmin?.email,
      actor_role: currentAdmin?.role,
      action: "payment_created_by_admin",
      entity_type: "payment",
      entity_id: data?.id || null,
      new_value: data || null,
    });

    setMessage("Payment added successfully.");

    setNewPaymentMemberId("");
    setNewPaymentAmount("");
    setNewPaymentMethod("cash");
    setNewPaymentReference("");
    setNewPaymentReceipt(null);

    await loadPayments();
  } catch (error: any) {
    console.error(error);
    setMessage(error.message || "Failed to create payment.");
  } finally {
    setCreatingPayment(false);
  }
}

  async function approvePayment(paymentId: string) {
    if (!canManagePayments) {
      setMessage("You do not have permission to approve payments.");
      return;
    }

    setApprovingId(paymentId);
    setMessage("");

    const paymentToApprove = payments.find((payment) => payment.id === paymentId);

    if (!paymentToApprove) {
      setApprovingId("");
      setMessage("Payment not found.");
      return;
    }

    const sharesToAdd = Math.floor(Number(paymentToApprove.amount) / 10000);

    const { data: paymentRecord, error: paymentFetchError } = await supabase
      .from("payments")
      .select("id, member_id, amount, payment_status")
      .eq("id", paymentId)
      .single();

    if (paymentFetchError || !paymentRecord) {
      console.error(paymentFetchError);
      setApprovingId("");
      setMessage("Could not fetch payment record.");
      return;
    }

    if (paymentRecord.payment_status === "approved") {
      setApprovingId("");
      setMessage("Payment is already approved.");
      return;
    }

    const { data: memberRecord, error: memberFetchError } = await supabase
      .from("members")
      .select("id, total_shares, portfolio_value")
      .eq("id", paymentRecord.member_id)
      .single();

    if (memberFetchError || !memberRecord) {
      console.error(memberFetchError);
      setApprovingId("");
      setMessage("Could not fetch member record.");
      return;
    }

    const updatedShares = Number(memberRecord.total_shares || 0) + sharesToAdd;
    const updatedPortfolioValue =
      Number(memberRecord.portfolio_value || 0) + Number(paymentRecord.amount);

    const { error: memberUpdateError } = await supabase
      .from("members")
      .update({
        total_shares: updatedShares,
        portfolio_value: updatedPortfolioValue,
      })
      .eq("id", paymentRecord.member_id);

    if (memberUpdateError) {
      console.error(memberUpdateError);
      setApprovingId("");
      setMessage("Could not update member shares.");
      return;
    }

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({ payment_status: "approved" })
      .eq("id", paymentId);

    if (paymentUpdateError) {
      console.error(paymentUpdateError);
      setApprovingId("");
      setMessage("Could not approve payment.");
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_admin_id: currentAdmin?.id,
      actor_auth_user_id: currentAdmin?.auth_user_id,
      actor_email: currentAdmin?.email,
      actor_role: currentAdmin?.role,
      action: "payment_approved",
      entity_type: "payment",
      entity_id: paymentId,
      old_value: {
        payment_status: "pending",
      },
      new_value: {
        payment_status: "approved",
        shares_added: sharesToAdd,
        amount: paymentRecord.amount,
      },
      metadata: {
        member_id: paymentRecord.member_id,
      },
    });

    setMessage("Payment approved successfully.");
    setApprovingId("");
    await loadPayments();
  }

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              Payment Validation Queue
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Review member-submitted payments and validate share purchases.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
            {
              payments.filter((payment) => payment.payment_status === "pending")
                .length
            }{" "}
            pending
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            {message}
          </div>
        )}
        
<div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
    <h3 className="text-xl font-black text-[#0D2D6E]">
      Add Payment for Member
    </h3>

    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <select
        value={newPaymentMemberId}
        onChange={(e) => setNewPaymentMemberId(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
      >
        <option value="">Select Member</option>

        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name} ({member.member_number || "No Number"})
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Payment Amount"
        value={newPaymentAmount}
        onChange={(e) => setNewPaymentAmount(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
      />

      <select
        value={newPaymentMethod}
        onChange={(e) => setNewPaymentMethod(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
      >
        <option value="cash">Cash</option>
        <option value="momo">Mobile Money</option>
        <option value="bank">Bank</option>
        <option value="transfer">Transfer</option>
      </select>

      <input
        type="text"
        placeholder="Reference"
        value={newPaymentReference}
        onChange={(e) => setNewPaymentReference(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
      />

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Upload Receipt / Proof
        </label>

        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) =>
            setNewPaymentReceipt(e.target.files?.[0] || null)
          }
          className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
        />
      </div>
    </div>

    <Button
      onClick={createPayment}
      disabled={creatingPayment}
      className="mt-6 px-6 py-3"
    >
      {creatingPayment ? "Submitting..." : "Add Payment"}
    </Button>
  </div>
        {loadingPayments ? (
          <p className="mt-6 font-semibold text-slate-600">
            Loading payments...
          </p>
        ) : payments.length === 0 ? (
          <p className="mt-6 font-semibold text-slate-600">
            No payment submissions found.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Member</th>
                  <th className="py-4">Email</th>
                  <th className="py-4">Amount</th>
                  <th className="py-4">Method</th>
                  <th className="py-4">Reference</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Date</th>
                  <th className="py-4">Action</th>
                  <th className="py-4">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => {
                  const member = Array.isArray(payment.members)
                    ? payment.members[0]
                    : payment.members;

                  return (
                    <tr key={payment.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {member?.full_name || "Unknown"}
                      </td>

                      <td className="py-4 text-slate-600">
                        {member?.email || "-"}
                      </td>

                      <td className="py-4 font-bold">
                        FCFA {Number(payment.amount || 0).toLocaleString()}
                      </td>

                      <td className="py-4 text-slate-600">
                        {payment.payment_method || "-"}
                      </td>

                      <td className="py-4 text-slate-600">
                        {payment.reference || "-"}
                      </td>

                      <td className="py-4">
                        <span
                          className={
                            payment.payment_status === "approved"
                              ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                              : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                          }
                        >
                          {payment.payment_status}
                        </span>
                      </td>

                      <td className="py-4 text-slate-600">
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="py-4">
                        {payment.payment_status === "pending" ? (
                          canManagePayments ? (
                            <Button
                              onClick={() => approvePayment(payment.id)}
                              disabled={approvingId === payment.id}
                              className="px-4 py-2"
                            >
                              {approvingId === payment.id
                                ? "Approving..."
                                : "Approve"}
                            </Button>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">
                              No access
                            </span>
                          )
                        ) : (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Approved
                          </span>
                        )}
                      </td>

                      <td className="py-4">
                        {payment.receipt_path ? (
                          <Button
                            onClick={() =>
                              openPaymentReceipt(payment.receipt_path!)
                            }
                            className="px-4 py-2"
                          >
                            View Receipt
                          </Button>
                        ) : (
                          <span className="text-slate-400">No receipt</span>
                        )}
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
  );
}