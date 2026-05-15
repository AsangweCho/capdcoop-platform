"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PieChart,
  WalletCards,
  BadgeDollarSign,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";

type Member = {
  id: string;
  full_name: string;
  member_number: string;
  membership_status: string;
  total_shares: number;
  portfolio_value: number;
  declared_dividends: number;
};

type MemberPayment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string;
  payment_status: string;
  created_at: string;
};

export default function MemberPortal() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);

  useEffect(() => {
    async function loadMember() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("members")
        .select(
          "id, full_name, member_number, membership_status, total_shares, portfolio_value, declared_dividends"
        )
        .eq("auth_user_id", userData.user.id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setMember(data);

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("id, amount, payment_method, reference, payment_status, created_at")
        .eq("member_id", data.id)
        .order("created_at", { ascending: false });

      if (paymentError) {
        console.error(paymentError);
      }

      setMemberPayments(paymentData || []);
      setLoading(false);
    }

    loadMember();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function submitPayment() {
    if (!member || !paymentAmount || !paymentReference) {
      setPaymentMessage("Please complete all payment fields.");
      return;
    }

    setSubmittingPayment(true);
    setPaymentMessage("");

    const { error } = await supabase.from("payments").insert({
      member_id: member.id,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      reference: paymentReference,
      payment_status: "pending",
    });

    if (error) {
      setPaymentMessage(error.message);
      setSubmittingPayment(false);
      return;
    }

    setPaymentMessage("Payment submitted successfully for admin review.");
    setPaymentAmount("");
    setPaymentReference("");

    const { data: refreshedPayments, error: refreshError } = await supabase
      .from("payments")
      .select("id, amount, payment_method, reference, payment_status, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

    if (refreshError) {
      console.error(refreshError);
    }

    setMemberPayments(refreshedPayments || []);
    setSubmittingPayment(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--capd-bg)] text-slate-900">
        <p className="text-xl font-bold text-[#0D2D6E]">
          Loading member dashboard...
        </p>
      </main>
    );
  }

  if (!member) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-10">
      <h1 className="text-3xl font-black text-[#0D2D6E]">
        Member record not found
      </h1>

      <p className="mt-3 text-slate-600">
        Your account is active, but no cooperative member profile has been linked yet.
        Please contact CAPDCOOP administration.
      </p>

      <button
        onClick={handleLogout}
        className="mt-6 rounded-2xl bg-[#0D2D6E] px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        Return to Login
      </button>
    </main>
  );
}

  const metrics = [
    {
      title: "Total Shares Held",
      value: member.total_shares.toLocaleString(),
      note: "Approved allocations",
      icon: PieChart,
    },
    {
      title: "Share Portfolio Value",
      value: `FCFA ${Number(member.portfolio_value).toLocaleString()}`,
      note: "Current records",
      icon: WalletCards,
    },
    {
      title: "Declared Dividends",
      value: `FCFA ${Number(member.declared_dividends).toLocaleString()}`,
      note: "Official declarations only",
      icon: BadgeDollarSign,
    },
    {
      title: "Membership Status",
      value: member.membership_status,
      note: member.member_number,
      icon: LayoutDashboard,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
<div className="flex items-center gap-3">
  <BrandLogo />
  <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
    Member Portal
  </div>
</div>

          <div className="flex items-center gap-3">
            <Button className="px-5 py-3">Buy More Shares</Button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
<div className="relative overflow-hidden rounded-[2rem] bg-[var(--capd-navy)] p-8 text-white shadow-sm">
  <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
  <div className="absolute -bottom-24 right-20 h-72 w-72 rounded-full bg-[var(--capd-green)]/20" />

  <div className="relative">
    <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-gold)]">
      Member Dashboard
    </p>

    <h1 className="mt-3 text-4xl font-black">
      Welcome back, {member.full_name}
    </h1>

    <p className="mt-4 max-w-2xl text-white/75">
      Track your cooperative participation, approved shares, portfolio value,
      payment history, and membership activity.
    </p>
  </div>
</div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ title, value, note, icon: Icon }) => (
           <Card key={title} className="border-slate-200 bg-white shadow-sm">
           <CardContent className="p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-bold text-slate-500">{title}</p>
                    <p className="mt-3 text-2xl font-black capitalize text-[#0D2D6E]">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{note}</p>
                  </div>

                 <div className="rounded-2xl bg-[var(--capd-navy)]/10 p-3 text-[var(--capd-navy)]">
                    <Icon size={23} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

       <Card className="mt-8 border-slate-200 bg-white shadow-sm">
<CardContent className="p-8">
<h2 className="text-2xl font-black text-[var(--capd-navy)]">
                Submit Share Payment
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Submit your membership or share subscription payment for admin
              validation.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <label className="text-sm font-bold text-slate-600">
                  Amount Paid
                </label>
                <input
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option>MTN Mobile Money</option>
                  <option>Orange Money</option>
                  <option>Bank Transfer</option>
                  <option>Card Payment</option>
                  <option>USDT</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600">
                  Transaction Reference
                </label>
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Enter reference"
                />
              </div>
            </div>

            {paymentMessage && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                {paymentMessage}
              </div>
            )}

            <Button
              onClick={submitPayment}
              disabled={submittingPayment}
              className="mt-6 px-6 py-3"
            >
              {submittingPayment ? "Submitting..." : "Submit Payment"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">
              Payment History
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              View your submitted payments and validation status.
            </p>

            {memberPayments.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No payment history yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Amount</th>
                      <th className="py-4">Method</th>
                      <th className="py-4">Reference</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {memberPayments.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="py-4 font-bold">
                          FCFA {Number(payment.amount).toLocaleString()}
                        </td>

                        <td className="py-4 text-slate-600">
                          {payment.payment_method}
                        </td>

                        <td className="py-4 text-slate-600">
                          {payment.reference}
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
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}