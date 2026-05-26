"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  PieChart,
  WalletCards,
  BadgeDollarSign,
  LogOut,
  PiggyBank,
  HandCoins,
  ReceiptText,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";


type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  member_number: string;
  membership_status: string;
  total_shares: number;
  portfolio_value: number;
  declared_dividends: number;
};

type PaymentMethodDetail = {
  id: string;
  method_name: string;
  display_name: string;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  branch_name: string | null;
  phone_number: string | null;
  wallet_provider: string | null;
  instructions: string | null;
};

type ShareCertificate = {
  id: string;
  certificate_name: string;
  certificate_path: string;
  created_at: string;
};

type MemberPayment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string;
  payment_status: string;
  created_at: string;
};

type SavingsAccount = {
  id: string;
  account_number: string | null;
  client_name: string;
  total_saved: number;
  total_withdrawn: number;
  monthly_fee_percent: number;
  status: string;
  start_date: string;
};

type SavingsTransaction = {
  id: string;
  savings_account_id: string;
  amount: number;
  transaction_type: string;
  payment_method: string;
  created_at: string;
};

type MemberLoan = {
  id: string;
  business_name: string | null;
  loan_amount: number;
  total_expected_repayment: number | null;
  daily_payment_amount: number | null;
  amount_repaid?: number | null;
  outstanding_balance?: number | null;
  status: string;
  start_date: string | null;
  created_at: string;
};

type FundingApplication = {
  id: string;
  business_name: string;
  business_type: string;
  requested_amount: number;
  daily_revenue_estimate: number;
  application_status: string;
  assigned_officer: string | null;
  review_notes: string | null;
  created_at: string;
};

export default function MemberPortal() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMethodDetails, setPaymentMethodDetails] = useState<
  PaymentMethodDetail[]
>([]);

  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [memberLoans, setMemberLoans] = useState<MemberLoan[]>([]);
  const [fundingApplications, setFundingApplications] = useState<FundingApplication[]>([]);
  const [shareCertificates, setShareCertificates] = useState<ShareCertificate[]>([]);

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, phone, member_number, membership_status, total_shares, portfolio_value, declared_dividends")
      .eq("auth_user_id", userData.user.id)
      .single();

const { data: paymentMethodData, error: paymentMethodError } = await supabase
  .from("payment_method_details")
  .select(
    "id, method_name, display_name, account_name, account_number, bank_name, branch_name, phone_number, wallet_provider, instructions"
  )
  .eq("is_active", true)
  .order("display_name", { ascending: true });

if (paymentMethodError) console.error(paymentMethodError);
setPaymentMethodDetails(paymentMethodData || []);

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    setMember(data);
    setProfileName(data.full_name || "");
    setProfilePhone(data.phone || "");

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount, payment_method, reference, payment_status, created_at")
      .eq("member_id", data.id)
      .order("created_at", { ascending: false });

    if (paymentError) console.error(paymentError);
    setMemberPayments(paymentData || []);

    const { data: savingsData, error: savingsError } = await supabase
      .from("savings_accounts")
      .select("id, account_number, client_name, total_saved, total_withdrawn, monthly_fee_percent, status, start_date")
      .eq("member_id", data.id)
      .order("created_at", { ascending: false });

    if (savingsError) console.error(savingsError);
    setSavingsAccounts(savingsData || []);

    if (savingsData && savingsData.length > 0) {
      const savingsIds = savingsData.map((item) => item.id);

      const { data: savingsTxData, error: savingsTxError } = await supabase
        .from("savings_transactions")
        .select("id, savings_account_id, amount, transaction_type, payment_method, created_at")
        .in("savings_account_id", savingsIds)
        .order("created_at", { ascending: false });

      if (savingsTxError) console.error(savingsTxError);
      setSavingsTransactions(savingsTxData || []);
    } else {
      setSavingsTransactions([]);
    }

    const { data: loansData, error: loansError } = await supabase
      .from("loans")
      .select("id, business_name, loan_amount, total_expected_repayment, daily_payment_amount, amount_repaid, outstanding_balance, status, start_date, created_at")
      .eq("member_id", data.id)
      .order("created_at", { ascending: false });

    if (loansError) console.error(loansError);
    setMemberLoans(loansData || []);

    const { data: certificateData, error: certificateError } = await supabase
      .from("share_certificates")
      .select("id, certificate_name, certificate_path, created_at")
      .eq("member_id", data.id)
      .order("created_at", { ascending: false });

    if (certificateError) console.error(certificateError);
    setShareCertificates(certificateData || []);

    const { data: applicationData, error: applicationError } = await supabase
      .from("business_applications")
      .select("id, business_name, business_type, requested_amount, daily_revenue_estimate, application_status, assigned_officer, review_notes, created_at")
      .eq("member_id", data.id)
      .order("created_at", { ascending: false });

    if (applicationError) console.error(applicationError);
    setFundingApplications(applicationData || []);

    setLoading(false);
  }

  async function updateProfile() {
    if (!member) return;

    if (!profileName.trim()) {
      setProfileMessage("Full name is required.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");

    const { error } = await supabase
      .from("members")
      .update({
        full_name: profileName.trim(),
        phone: profilePhone.trim() || null,
      })
      .eq("id", member.id);

    if (error) {
      setProfileMessage(error.message);
      setSavingProfile(false);
      return;
    }

    setProfileMessage("Profile updated successfully.");
    setEditingProfile(false);
    setSavingProfile(false);
    await loadMember();
  }

  async function openShareCertificate(certificatePath: string, certificateName: string) {
    const { data, error } = await supabase.storage
      .from("share-certificates")
      .createSignedUrl(certificatePath, 300, {
        download: certificateName || "share-certificate",
      });

    if (error || !data?.signedUrl) {
      console.error(error);
      alert("Could not generate certificate download link.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function submitPayment() {
    if (!member || !paymentAmount || !paymentReference || !paymentReceipt) {
      setPaymentMessage("Please complete all payment fields and upload your receipt.");
      return;
    }

    setSubmittingPayment(true);
    setPaymentMessage("");

    const fileExt = paymentReceipt.name.split(".").pop();
    const filePath = `${member.id}/${Date.now()}-${paymentReference}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(filePath, paymentReceipt);

    if (uploadError) {
      setPaymentMessage(uploadError.message);
      setSubmittingPayment(false);
      return;
    }

    const { error } = await supabase.from("payments").insert({
      member_id: member.id,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      reference: paymentReference,
      payment_status: "pending",
      receipt_path: filePath,
    });

    if (error) {
      setPaymentMessage(error.message);
      setSubmittingPayment(false);
      return;
    }

    setPaymentMessage("Payment submitted successfully for admin review.");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentReceipt(null);

    await loadMember();
    setSubmittingPayment(false);
  }

  const savingsSummary = useMemo(() => {
    const totalSaved = savingsAccounts.reduce((sum, account) => sum + Number(account.total_saved || 0), 0);
    const totalWithdrawn = savingsAccounts.reduce((sum, account) => sum + Number(account.total_withdrawn || 0), 0);
    const available = totalSaved - totalWithdrawn;
    const projectedDeduction = savingsAccounts.reduce((sum, account) => {
      const accountAvailable = Number(account.total_saved || 0) - Number(account.total_withdrawn || 0);
      return sum + accountAvailable * (Number(account.monthly_fee_percent || 2) / 100);
    }, 0);

    return {
      totalSaved,
      totalWithdrawn,
      available,
      projectedDeduction,
      netAfterDeduction: available - projectedDeduction,
    };
  }, [savingsAccounts]);

  const loanSummary = useMemo(() => {
    const activeLoans = memberLoans.filter((loan) => ["active", "approved", "disbursed"].includes(loan.status));

    const activePrincipal = activeLoans.reduce((sum, loan) => sum + Number(loan.loan_amount || 0), 0);
    const outstandingBalance = activeLoans.reduce((sum, loan) => sum + Number(loan.outstanding_balance || 0), 0);
    const dailyPayment = activeLoans.reduce((sum, loan) => sum + Number(loan.daily_payment_amount || 0), 0);

    return {
      activeCount: activeLoans.length,
      activePrincipal,
      outstandingBalance,
      dailyPayment,
    };
  }, [memberLoans]);

  const pendingPaymentsTotal = useMemo(() => {
    return memberPayments
      .filter((payment) => payment.payment_status === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [memberPayments]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-lg font-semibold text-slate-600">Loading member portal...</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-black text-[#0D2D6E]">Member record not found</h1>
          <p className="mt-4 text-slate-600">Your login is valid, but no CAPDCOOP member record is linked to this account.</p>
          <button onClick={handleLogout} className="mt-6 rounded-2xl bg-[#0D2D6E] px-6 py-3 font-bold text-white hover:opacity-90">
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  if (member.membership_status === "pending") {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-xl rounded-[2rem] bg-white p-10 text-center shadow-xl">
            <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-green)]">Membership Under Review</p>
            <h1 className="mt-4 text-3xl font-black text-[var(--capd-navy)]">Your CAPDCOOP membership is pending activation.</h1>
            <p className="mt-4 leading-7 text-slate-600">
              Thank you for registering with CAPDCOOP. Our membership team is reviewing your account and will contact you shortly.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/contact" className="rounded-2xl bg-[var(--capd-navy)] px-6 py-3 font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]">
                Contact Us
              </Link>
              <button onClick={handleLogout} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-[var(--capd-navy)] transition-all duration-300 hover:border-[var(--capd-green)] hover:text-[var(--capd-green)]">
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const metrics = [
    { title: "Total Shares Held", value: member.total_shares.toLocaleString(), note: "Approved allocations", icon: PieChart },
    { title: "Share Portfolio Value", value: `FCFA ${Number(member.portfolio_value).toLocaleString()}`, note: "Current records", icon: WalletCards },
    { title: "Declared Dividends", value: `FCFA ${Number(member.declared_dividends).toLocaleString()}`, note: "Official declarations only", icon: BadgeDollarSign },
    { title: "Savings Balance", value: `FCFA ${Number(savingsSummary.available).toLocaleString()}`, note: `Net after 2%: FCFA ${Number(savingsSummary.netAfterDeduction).toLocaleString()}`, icon: PiggyBank },
    { title: "Active Loans", value: `FCFA ${Number(loanSummary.outstandingBalance || loanSummary.activePrincipal).toLocaleString()}`, note: `${loanSummary.activeCount} active loan(s)`, icon: HandCoins },
    { title: "Pending Payments", value: `FCFA ${Number(pendingPaymentsTotal).toLocaleString()}`, note: "Awaiting admin validation", icon: ReceiptText },
    { title: "Monthly Deduction", value: `FCFA ${Number(savingsSummary.projectedDeduction).toLocaleString()}`, note: "Projected savings fee", icon: TrendingDown },
    { title: "Membership Status", value: member.membership_status, note: member.member_number, icon: LayoutDashboard },
  ];

const selectedPaymentDetails = paymentMethodDetails.find(
  (method) => method.method_name === paymentMethod
);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">Member Portal</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="px-5 py-3">Buy More Shares</Button>

            <Link href="/apply">
              <Button className="px-5 py-3 bg-[var(--capd-green)] hover:opacity-90">Apply for Funding</Button>
            </Link>

            <Link href="/change-password">
              <Button className="px-5 py-3 bg-[#0D2D6E] hover:opacity-90">Change Password</Button>
            </Link>

            <button onClick={handleLogout} className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
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
            <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-gold)]">Member Dashboard</p>
            <h1 className="mt-3 text-4xl font-black">Welcome back, {member.full_name}</h1>
            <p className="mt-4 max-w-2xl text-white/75">Track your shares, savings, funding applications, payments, and cooperative records.</p>
          </div>
        </div>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[var(--capd-navy)]">My Profile</h2>
                <p className="mt-2 text-sm text-slate-600">Manage your basic member information and account security.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/change-password">
                  <Button className="px-5 py-3 bg-[#0D2D6E] hover:opacity-90">Change Password</Button>
                </Link>

                <button
                  onClick={() => {
                    setEditingProfile(!editingProfile);
                    setProfileMessage("");
                    setProfileName(member.full_name || "");
                    setProfilePhone(member.phone || "");
                  }}
                  className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--capd-green)]"
                >
                  {editingProfile ? "Cancel Edit" : "Edit Profile"}
                </button>
              </div>
            </div>

            {!editingProfile ? (
              <div className="mt-6 grid gap-5 md:grid-cols-4">
                <InfoBlock label="Name" value={member.full_name} />
                <InfoBlock label="Phone" value={member.phone || "-"} />
                <InfoBlock label="Member Number" value={member.member_number} />
                <InfoBlock label="Status" value={member.membership_status} highlight />
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Full name" />
                <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Phone number" />
                <Button onClick={updateProfile} disabled={savingProfile} className="px-6 py-3 md:w-fit">
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            )}

            {profileMessage && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">{profileMessage}</div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ title, value, note, icon: Icon }) => (
            <Card key={title} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-bold text-slate-500">{title}</p>
                    <p className="mt-3 text-2xl font-black capitalize text-[#0D2D6E]">{value}</p>
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
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">My Savings</h2>
            <p className="mt-2 text-sm text-slate-600">View your daily savings balance, projected deduction, and recent savings deposits.</p>

            {savingsAccounts.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">Savings Balance: FCFA 0. You do not have an active savings account yet.</p>
            ) : (
              <div className="mt-6 space-y-6">
                {savingsAccounts.map((account) => {
                  const totalSaved = Number(account.total_saved || 0);
                  const totalWithdrawn = Number(account.total_withdrawn || 0);
                  const available = totalSaved - totalWithdrawn;
                  const deduction = available * (Number(account.monthly_fee_percent || 2) / 100);
                  const netWithdrawal = available - deduction;

                  return (
                    <div key={account.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="grid gap-5 md:grid-cols-4">
                        <InfoBlock label="Account" value={account.account_number || "Savings Account"} />
                        <InfoBlock label="Total Saved" value={`FCFA ${totalSaved.toLocaleString()}`} />
                        <InfoBlock label="Available Balance" value={`FCFA ${available.toLocaleString()}`} />
                        <InfoBlock label="Net After Deduction" value={`FCFA ${netWithdrawal.toLocaleString()}`} highlight />
                      </div>
                      <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">
                        Deduction: FCFA {deduction.toLocaleString()} · Status: {account.status}
                      </div>
                    </div>
                  );
                })}

                <SimpleTable
                  headers={["Type", "Amount", "Method", "Date"]}
                  rows={savingsTransactions.slice(0, 10).map((tx) => [
                    tx.transaction_type,
                    `FCFA ${Number(tx.amount).toLocaleString()}`,
                    tx.payment_method,
                    new Date(tx.created_at).toLocaleDateString(),
                  ])}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">My Loans</h2>

            {memberLoans.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">Active Loans: FCFA 0. You do not have any loan record yet.</p>
            ) : (
              <SimpleTable
                headers={["Business", "Principal", "Expected", "Repaid", "Balance", "Daily", "Status", "Date"]}
                rows={memberLoans.map((loan) => [
                  loan.business_name || "-",
                  `FCFA ${Number(loan.loan_amount || 0).toLocaleString()}`,
                  `FCFA ${Number(loan.total_expected_repayment || 0).toLocaleString()}`,
                  `FCFA ${Number(loan.amount_repaid || 0).toLocaleString()}`,
                  `FCFA ${Number(loan.outstanding_balance || 0).toLocaleString()}`,
                  `FCFA ${Number(loan.daily_payment_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  loan.status || "-",
                  new Date(loan.created_at).toLocaleDateString(),
                ])}
              />
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">My Share Certificates</h2>
            <p className="mt-2 text-sm text-slate-600">View and download your official CAPDCOOP share certificates.</p>

            {shareCertificates.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">No share certificates have been uploaded yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Certificate</th>
                      <th className="py-4">Date Uploaded</th>
                      <th className="py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareCertificates.map((certificate) => (
                      <tr key={certificate.id} className="border-b">
                        <td className="py-4 font-bold text-[var(--capd-navy)]">{certificate.certificate_name}</td>
                        <td className="py-4 text-slate-600">{new Date(certificate.created_at).toLocaleDateString()}</td>
                        <td className="py-4">
                          <button
                            onClick={() => openShareCertificate(certificate.certificate_path, certificate.certificate_name)}
                            className="inline-block rounded-2xl bg-[var(--capd-navy)] px-5 py-2 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
                          >
                            Download Share Certificate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">Submit Share Payment</h2>
            <p className="mt-2 text-sm text-slate-600">Submit your membership or share subscription payment for admin validation.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Amount paid" />
              <select
  value={paymentMethod}
  onChange={(event) => setPaymentMethod(event.target.value)}
  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
>
  {paymentMethodDetails.length === 0 ? (
    <>
      <option>MTN Mobile Money</option>
      <option>Orange Money</option>
      <option>Bank Transfer</option>
      <option>Cash</option>
      <option>USDT</option>
    </>
  ) : (
    paymentMethodDetails.map((method) => (
      <option key={method.id} value={method.method_name}>
        {method.display_name}
      </option>
    ))
  )}
</select>
              <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Transaction reference" />
              <input type="file" accept="image/*,.pdf" onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
            </div>

            {selectedPaymentDetails && (
  <div className="mt-6 rounded-3xl border border-[#0D2D6E]/10 bg-slate-50 p-6">
    <h3 className="text-xl font-black text-[#0D2D6E]">
      {selectedPaymentDetails.display_name} Details
    </h3>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {selectedPaymentDetails.account_name && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Account Name
          </p>
          <p className="mt-1 font-black text-slate-800">
            {selectedPaymentDetails.account_name}
          </p>
        </div>
      )}

      {selectedPaymentDetails.phone_number && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Phone Number
          </p>
          <p className="mt-1 font-black text-slate-800">
            {selectedPaymentDetails.phone_number}
          </p>
        </div>
      )}

      {selectedPaymentDetails.account_number && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Account / Wallet
          </p>
          <p className="mt-1 break-all font-black text-slate-800">
            {selectedPaymentDetails.account_number}
          </p>
        </div>
      )}

      {selectedPaymentDetails.bank_name && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Bank Name
          </p>
          <p className="mt-1 font-black text-slate-800">
            {selectedPaymentDetails.bank_name}
          </p>
        </div>
      )}

      {selectedPaymentDetails.branch_name && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Branch
          </p>
          <p className="mt-1 font-black text-slate-800">
            {selectedPaymentDetails.branch_name}
          </p>
        </div>
      )}

      {selectedPaymentDetails.wallet_provider && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">
            Provider / Network
          </p>
          <p className="mt-1 font-black text-slate-800">
            {selectedPaymentDetails.wallet_provider}
          </p>
        </div>
      )}
    </div>

    {selectedPaymentDetails.instructions && (
      <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
        {selectedPaymentDetails.instructions}
      </div>
    )}
  </div>
)}

            {paymentMessage && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">{paymentMessage}</div>}

            <Button onClick={submitPayment} disabled={submittingPayment} className="mt-6 px-6 py-3">
              {submittingPayment ? "Submitting..." : "Submit Payment"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">Payment History</h2>
            {memberPayments.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">Pending Payments: FCFA 0. No payment history yet.</p>
            ) : (
              <SimpleTable
                headers={["Amount", "Method", "Reference", "Status", "Date"]}
                rows={memberPayments.map((payment) => [
                  `FCFA ${Number(payment.amount).toLocaleString()}`,
                  payment.payment_method,
                  payment.reference,
                  payment.payment_status,
                  new Date(payment.created_at).toLocaleDateString(),
                ])}
              />
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">My Funding Applications</h2>
                <p className="mt-2 text-sm text-slate-600">Track your business funding requests and review progress.</p>
              </div>
              <Link href="/apply">
                <Button className="px-5 py-3 bg-[var(--capd-green)] hover:opacity-90">New Application</Button>
              </Link>
            </div>

            {fundingApplications.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">You have not submitted any funding applications yet.</p>
            ) : (
              <SimpleTable
                headers={["Business", "Type", "Requested", "Daily Revenue", "Status", "Officer", "Date"]}
                rows={fundingApplications.map((application) => [
                  application.business_name,
                  application.business_type,
                  `FCFA ${Number(application.requested_amount).toLocaleString()}`,
                  `FCFA ${Number(application.daily_revenue_estimate).toLocaleString()}`,
                  application.application_status.replaceAll("_", " "),
                  application.assigned_officer || "Not assigned",
                  new Date(application.created_at).toLocaleDateString(),
                ])}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function InfoBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={highlight ? "mt-2 font-black capitalize text-[#009B5A]" : "mt-2 font-black text-[#0D2D6E]"}>
        {value}
      </p>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
            {headers.map((header) => (
              <th key={header} className="py-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${index}-${cellIndex}`}
                  className={cellIndex === 0 ? "py-4 font-bold text-[#0D2D6E]" : "py-4 text-slate-600"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
