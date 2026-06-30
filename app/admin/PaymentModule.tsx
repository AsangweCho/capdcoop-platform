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
  agent_code: string | null;
  registered_by_agent_name: string | null;
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
    approved_at?: string | null;
  approved_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  edit_reason?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  registered_by_agent_id: string | null;
total_shares: number | null;
portfolio_value: number | null;
};

interface PaymentModuleProps {
  currentAdmin: any;
}

const SHARE_PRICE = 10000;

function getPaymentTypeLabel(type: string | null | undefined) {
  if (type === "share_purchase") return "Share Purchase";
  if (type === "loan_repayment") return "Aid Repayment";
  if (type === "aid_repayment") return "Aid Repayment";
  if (type === "registration") return "Registration";
  if (type === "savings") return "Savings";
  if (type === "other") return "Other";

  return type || "-";
}

function getPaymentMethodLabel(method: string | null | undefined) {
  if (method === "momo") return "Mobile Money";
  if (method === "cash") return "Cash";
  if (method === "bank") return "Bank Transfer";
  if (method === "card") return "Card Payment";
  if (method === "Orange Money") return "Orange Money";
  if (method === "Card Payment") return "Card Payment";

  return method || "-";
}

function canEditOrDeletePayment(payment: Payment) {
  return payment.payment_status === "pending";
}

export default function PaymentModule({
  currentAdmin,
}: PaymentModuleProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [approvingId, setApprovingId] = useState("");

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
const [updatingPayment, setUpdatingPayment] = useState(false);
const [deletingPaymentId, setDeletingPaymentId] = useState("");

const [editPaymentAmount, setEditPaymentAmount] = useState("");
const [editPaymentMethod, setEditPaymentMethod] = useState("");
const [editPaymentType, setEditPaymentType] = useState("");
const [editPaymentReference, setEditPaymentReference] = useState("");
const [editPaymentStatus, setEditPaymentStatus] = useState("");
const [editPaymentReason, setEditPaymentReason] = useState("");

const [reversingPayment, setReversingPayment] = useState<any | null>(null);
const [reversalReason, setReversalReason] = useState("");
const [reversingSharePayment, setReversingSharePayment] = useState(false);

const [correctingPayment, setCorrectingPayment] = useState<any | null>(null);
const [newMemberId, setNewMemberId] = useState("");
const [correctionReason, setCorrectionReason] = useState("");
const [correctingMember, setCorrectingMember] = useState(false);

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
 const isSuperAdmin = currentAdmin?.role === "super_admin";

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
      .eq("is_deleted", false)
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


const correctPaymentMember = async () => {
  if (!correctingPayment) {
    setMessage("No payment selected for correction.");
    return;
  }

  if (!newMemberId) {
    setMessage("Please select the correct member.");
    return;
  }

  if (!correctionReason.trim() || correctionReason.trim().length < 10) {
    setMessage("Please enter a correction reason of at least 10 characters.");
    return;
  }

  try {
    setCorrectingMember(true);
    setMessage("");

    const { data, error } = await supabase.rpc("admin_correct_payment_member", {
      p_payment_id: correctingPayment.id,
      p_new_member_id: newMemberId,
      p_reason: correctionReason.trim(),
    });

    if (error) {
      console.error("Error correcting payment member:", error);
      setMessage(error.message);
      return;
    }

    setMessage(
      data?.message ||
        `Payment corrected successfully and moved to the selected member.`
    );

    setCorrectingPayment(null);
    setNewMemberId("");
    setCorrectionReason("");

    await loadPayments();
  } catch (err) {
    console.error("Unexpected correction error:", err);
    setMessage("Unexpected error while correcting payment member.");
  } finally {
    setCorrectingMember(false);
  }
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
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


  const reversePostedSharePayment = async () => {
  if (!reversingPayment) {
    setMessage("No payment selected for reversal.");
    return;
  }

  if (!reversalReason.trim() || reversalReason.trim().length < 10) {
    setMessage("Please enter a reversal reason of at least 10 characters.");
    return;
  }

  try {
    setReversingSharePayment(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "admin_reverse_posted_share_payment",
      {
        p_payment_id: reversingPayment.id,
        p_reason: reversalReason.trim(),
      }
    );

    if (error) {
      console.error("Error reversing posted share payment:", error);
      setMessage(error.message);
      return;
    }

    setMessage(
      data?.message ||
        `Posted share payment reversed successfully.`
    );

    setReversingPayment(null);
    setReversalReason("");

    await loadPayments();
  } catch (err) {
    console.error("Unexpected share reversal error:", err);
    setMessage("Unexpected error while reversing posted share payment.");
  } finally {
    setReversingSharePayment(false);
  }
};

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

async function createAgentCommissionForPayment(payment: Payment) {
  const member = payment.members;

  if (!member) return;

  let commissionAgentId = member.registered_by_agent_id || null;

  if (!commissionAgentId && member.agent_code) {
    const { data: agentByCode, error: agentByCodeError } = await supabase
      .from("agents")
      .select("id")
      .eq("agent_code", member.agent_code)
      .eq("status", "active")
      .maybeSingle();

    if (agentByCodeError) {
      console.error(agentByCodeError);
    }

    if (agentByCode?.id) {
      commissionAgentId = agentByCode.id;

      await supabase
        .from("members")
        .update({
          registered_by_agent_id: agentByCode.id,
        })
        .eq("id", member.id);
    }
  }

  if (!commissionAgentId) return;

  const { data: existingCommission, error: existingCommissionError } =
    await supabase
      .from("agent_commissions")
      .select("id")
      .eq("payment_id", payment.id)
      .maybeSingle();

  if (existingCommissionError) {
    console.error(existingCommissionError);
  }

  if (existingCommission) return;

  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("id, commission_rate, status")
    .eq("id", commissionAgentId)
    .maybeSingle();

  if (agentError) {
    console.error(agentError);
    return;
  }

  if (!agentData || agentData.status !== "active") return;

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
    setMessage("Payment approved, but commission could not be created.");
  }
}

async function approvePayment(payment: Payment) {
  if (!canManagePayments) return;

  setApprovingId(payment.id);
  setMessage("");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (payment.payment_type === "share_purchase") {
      const { data, error } = await supabase.rpc(
        "post_approved_member_share_payment",
        {
          p_payment_id: payment.id,
          p_approved_by: user?.id || null,
        }
      );

      if (error) {
        console.error(error);
        setMessage(error.message);
        setApprovingId("");
        return;
      }

      await createAgentCommissionForPayment(payment);

      console.log("Share payment posting result:", data);

      await loadPayments();

      setMessage("Share purchase payment approved and posted successfully.");
      setApprovingId("");
      return;
    }

    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq("id", payment.id);

    if (error) {
      console.error(error);
      setMessage("Failed to approve payment.");
      setApprovingId("");
      return;
    }

    await createAgentCommissionForPayment(payment);

    await loadPayments();

    setMessage("Payment approved successfully.");
  } catch (err) {
    console.error(err);
    setMessage("Unexpected approval error.");
  }

  setApprovingId("");
}

function openEditPayment(payment: Payment) {
  setEditingPayment(payment);
  setEditPaymentAmount(String(payment.amount || ""));
  setEditPaymentMethod(payment.payment_method || "cash");
  setEditPaymentType(payment.payment_type || "share_purchase");
  setEditPaymentReference(payment.reference || "");
  setEditPaymentStatus(payment.payment_status || "pending");
  setEditPaymentReason("");
}

function closeEditPayment() {
  setEditingPayment(null);
  setEditPaymentAmount("");
  setEditPaymentMethod("");
  setEditPaymentType("");
  setEditPaymentReference("");
  setEditPaymentStatus("");
  setEditPaymentReason("");
}

async function updatePaymentAsSuperAdmin() {
  if (!editingPayment || !isSuperAdmin) return;

  const amount = Number(editPaymentAmount || 0);

  if (amount <= 0) {
    setMessage("Payment amount must be greater than zero.");
    return;
  }

  if (!editPaymentReason.trim()) {
    setMessage("Edit reason is required.");
    return;
  }

  setUpdatingPayment(true);
  setMessage("");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("admin_update_payment", {
      p_payment_id: editingPayment.id,
      p_amount: amount,
      p_payment_method: editPaymentMethod,
      p_payment_type: editPaymentType,
      p_reference: editPaymentReference || null,
      p_payment_status: editPaymentStatus,
      p_edit_reason: editPaymentReason,
      p_performed_by: user?.id || null,
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setUpdatingPayment(false);
      return;
    }

    await loadPayments();
    closeEditPayment();

    setMessage("Payment updated successfully.");
  } catch (err) {
    console.error(err);
    setMessage("Unexpected payment update error.");
  }

  setUpdatingPayment(false);
}

async function deletePaymentAsSuperAdmin(payment: Payment) {
  if (!isSuperAdmin) return;

  const reason = window.prompt(
    "Enter the reason for deleting this payment. This will be audited."
  );

  if (!reason || !reason.trim()) {
    setMessage("Delete reason is required.");
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to delete this payment? It will be hidden but kept in audit history."
  );

  if (!confirmed) return;

  setDeletingPaymentId(payment.id);
  setMessage("");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("admin_soft_delete_payment", {
      p_payment_id: payment.id,
      p_delete_reason: reason,
      p_performed_by: user?.id || null,
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setDeletingPaymentId("");
      return;
    }

    await loadPayments();

    setMessage("Payment deleted successfully.");
  } catch (err) {
    console.error(err);
    setMessage("Unexpected payment delete error.");
  }

  setDeletingPaymentId("");
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
  <>
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
  Aid Repayment
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
  {getPaymentTypeLabel(payment.payment_type)}
</td>
                    <td className="py-4 font-bold">
                      FCFA{" "}
                      {Number(payment.amount).toLocaleString()}
                    </td>

  <td className="py-4">
  {getPaymentMethodLabel(payment.payment_method)}
</td>

                    <td className="py-4">
                      {payment.reference || "-"}
                    </td>

                    <td className="py-4">
<span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    payment.payment_status === "approved"
      ? "bg-green-50 text-green-700"
      : payment.payment_status === "rejected"
        ? "bg-red-50 text-red-700"
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
  <div className="flex flex-wrap gap-2">
    {payment.payment_status === "pending" ? (
      <Button
        onClick={() => approvePayment(payment)}
        disabled={approvingId === payment.id}
      >
        {approvingId === payment.id ? "Approving..." : "Approve"}
      </Button>
    ) : (
      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
        Approved
      </span>
    )}

    {isSuperAdmin && canEditOrDeletePayment(payment) && (
      <>
        <button
          onClick={() => openEditPayment(payment)}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
        >
          Edit
        </button>

        <button
          onClick={() => deletePaymentAsSuperAdmin(payment)}
          disabled={deletingPaymentId === payment.id}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deletingPaymentId === payment.id ? "Deleting..." : "Delete"}
        </button>

        <button
          type="button"
          onClick={() => {
            setCorrectingPayment(payment);
            setNewMemberId(payment.member_id || "");
            setCorrectionReason("");
          }}
          className="rounded-md border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
        >
          Correct Member
        </button>
      </>
    )}

    {isSuperAdmin &&
      payment.payment_type === "share_purchase" &&
      payment.payment_status === "approved" && (
        <button
          type="button"
          onClick={() => {
            setReversingPayment(payment);
            setReversalReason("");
          }}
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Reverse
        </button>
      )}

    {isSuperAdmin && !canEditOrDeletePayment(payment) && (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        Locked
      </span>
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

{correctingPayment && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-bold text-slate-900">
        Correct Payment Member
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Move this payment from the wrong member to the correct member. This will
        be recorded in the financial audit logs.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Current Member:</span>{" "}
          {correctingPayment.members?.full_name ||
            correctingPayment.member_name ||
            "Unknown"}
        </p>
        <p>
          <span className="font-semibold">Amount:</span>{" "}
          {formatMoney(Number(correctingPayment.amount || 0))}
        </p>
        <p>
          <span className="font-semibold">Type:</span>{" "}
          {correctingPayment.payment_type}
        </p>
        <p>
          <span className="font-semibold">Reference:</span>{" "}
          {correctingPayment.reference || "N/A"}
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-slate-700">
          Correct Member
        </label>
        <select
          value={newMemberId}
          onChange={(e) => setNewMemberId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select correct member</option>
          {members.map((member: any) => (
            <option key={member.id} value={member.id}>
              {member.full_name} — {member.member_number}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-slate-700">
          Correction Reason
        </label>
        <textarea
          value={correctionReason}
          onChange={(e) => setCorrectionReason(e.target.value)}
          rows={4}
          placeholder="Example: Payment was wrongly assigned to CAP-M-0009. Correct member is CAP-M-0008."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setCorrectingPayment(null);
            setNewMemberId("");
            setCorrectionReason("");
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          disabled={correctingMember}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={correctPaymentMember}
          disabled={correctingMember}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {correctingMember ? "Correcting..." : "Confirm Correction"}
        </button>
      </div>
    </div>
  </div>
)}

{reversingPayment && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-bold text-red-700">
        Reverse Posted Share Payment
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        This will reverse the posted share payment, mark the share transaction
        as reversed, reduce the member&apos;s share balance, and write a
        financial audit log. This action should only be used for confirmed
        mistakes.
      </p>

      <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        <p>
          <span className="font-semibold">Member:</span>{" "}
          {reversingPayment.members?.full_name ||
            reversingPayment.member_name ||
            "Unknown"}
        </p>
        <p>
          <span className="font-semibold">Amount:</span>{" "}
          {formatMoney(Number(reversingPayment.amount || 0))}
        </p>
        <p>
          <span className="font-semibold">Type:</span>{" "}
          {reversingPayment.payment_type}
        </p>
        <p>
          <span className="font-semibold">Reference:</span>{" "}
          {reversingPayment.reference || "N/A"}
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-slate-700">
          Reversal Reason
        </label>
        <textarea
          value={reversalReason}
          onChange={(e) => setReversalReason(e.target.value)}
          rows={4}
          placeholder="Example: Payment was wrongly approved and must be reversed from the share ledger."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setReversingPayment(null);
            setReversalReason("");
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          disabled={reversingSharePayment}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={reversePostedSharePayment}
          disabled={reversingSharePayment}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {reversingSharePayment ? "Reversing..." : "Confirm Reversal"}
        </button>
      </div>
    </div>
  </div>
)}

    {editingPayment && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-[#0D2D6E]">
                Edit Payment
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Super Admin correction. A reason is required and the action will be audited.
              </p>
            </div>

            <button
              onClick={closeEditPayment}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <input
              type="number"
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="Amount"
            />

            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="cash">Cash</option>
              <option value="momo">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card Payment</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Card Payment">Card Payment</option>
            </select>

            <select
              value={editPaymentType}
              onChange={(e) => setEditPaymentType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="share_purchase">Share Purchase</option>
              <option value="loan_repayment">Aid Repayment</option>
              <option value="registration">Registration</option>
              <option value="savings">Savings</option>
              <option value="other">Other</option>
            </select>

            <select
              value={editPaymentStatus}
              onChange={(e) => setEditPaymentStatus(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <input
              type="text"
              value={editPaymentReference}
              onChange={(e) => setEditPaymentReference(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2"
              placeholder="Reference"
            />

            <textarea
              value={editPaymentReason}
              onChange={(e) => setEditPaymentReason(e.target.value)}
              className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2"
              placeholder="Reason for correction"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={updatePaymentAsSuperAdmin}
              disabled={updatingPayment}
              className="px-6 py-3"
            >
              {updatingPayment ? "Saving..." : "Save Correction"}
            </Button>

            <button
              onClick={closeEditPayment}
              className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}