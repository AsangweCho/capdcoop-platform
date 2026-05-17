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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [fundingApplications, setFundingApplications] = useState<
  FundingApplication[]
>([]);
const [loadingApplications, setLoadingApplications] = useState(true);
const [shareCertificates, setShareCertificates] = useState<ShareCertificate[]>([]);

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
  "id, full_name, phone, member_number, membership_status, total_shares, portfolio_value, declared_dividends"
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
    .select(
      "id, amount, payment_method, reference, payment_status, created_at"
    )
    .eq("member_id", data.id)
    .order("created_at", { ascending: false });

  if (paymentError) {
    console.error(paymentError);
  }
  const { data: certificateData, error: certificateError } = await supabase
  .from("share_certificates")
  .select("id, certificate_name, certificate_path, created_at")
  .eq("member_id", data.id)
  .order("created_at", { ascending: false });

if (certificateError) {
  console.error(certificateError);
}

setShareCertificates(certificateData || []);

  setMemberPayments(paymentData || []);
  await loadFundingApplications(data.id);
  
const { data: applicationData, error: applicationError } = await supabase
  .from("business_applications")
  .select(
    "id, business_name, business_type, requested_amount, daily_revenue_estimate, application_status, assigned_officer, review_notes, created_at"
  )
  .eq("member_id", data.id)
  .order("created_at", { ascending: false });
  if (applicationError) {
    console.error(applicationError);
  }

  setFundingApplications(applicationData || []);

  setLoading(false);
}
    loadMember();
  }, []);
async function loadFundingApplications(memberId: string) {
  setLoadingApplications(true);

  const { data: applicationData, error: applicationError } = await supabase
    .from("business_applications")
    .select(
      "id, business_name, business_type, requested_amount, daily_revenue_estimate, application_status, assigned_officer, review_notes, created_at"
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (applicationError) {
    console.error(applicationError);
    setLoadingApplications(false);
    return;
  }

  setFundingApplications(applicationData || []);
  setLoadingApplications(false);
}
async function openShareCertificate(
  certificatePath: string,
  certificateName: string
) {
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

  const { data: refreshedPayments, error: refreshError } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, reference, payment_status, created_at, receipt_path"
    )
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
    <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <p className="text-lg font-semibold text-slate-600">
        Loading member portal...
      </p>
    </main>
  );
}

if (!member) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
      <div className="max-w-xl rounded-3xl bg-white p-10 shadow-xl text-center">
        <h1 className="text-3xl font-black text-[#0D2D6E]">
          Member record not found
        </h1>

        <p className="mt-4 text-slate-600">
          Your login is valid, but no CAPDCOOP member record is linked to this account.
        </p>

        <button
          onClick={handleLogout}
          className="mt-6 rounded-2xl bg-[#0D2D6E] px-6 py-3 font-bold text-white hover:opacity-90"
        >
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
          <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-green)]">
            Membership Under Review
          </p>

          <h1 className="mt-4 text-3xl font-black text-[var(--capd-navy)]">
            Your CAPDCOOP membership is pending activation.
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Thank you for registering with CAPDCOOP. Our membership team is
            reviewing your account and will contact you shortly for subscription
            and activation.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-2xl bg-[var(--capd-navy)] px-6 py-3 font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
            >
              Contact Us
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-[var(--capd-navy)] transition-all duration-300 hover:border-[var(--capd-green)] hover:text-[var(--capd-green)]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
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
            <div className="flex items-center gap-3">
  <Button className="px-5 py-3">Buy More Shares</Button>

  <Link href="/apply">
    <Button className="px-5 py-3 bg-[var(--capd-green)] hover:opacity-90">
      Apply for Funding
    </Button>
  </Link>

  <button
    onClick={handleLogout}
    className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
  >
    <LogOut size={18} className="mr-2" />
    Logout
  </button>
</div>
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
      My Share Certificates
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      View and download your official CAPDCOOP share certificates.
    </p>

    {shareCertificates.length === 0 ? (
      <p className="mt-6 font-semibold text-slate-600">
        No share certificates have been uploaded yet.
      </p>
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
  <td className="py-4 font-bold text-[var(--capd-navy)]">
    <div className="flex items-center gap-2">
      <span>
        {certificate.certificate_name?.toLowerCase().endsWith(".pdf")
          ? "📄"
          : "🖼️"}
      </span>
      <span>{certificate.certificate_name}</span>
    </div>
  </td>

  <td className="py-4 text-slate-600">
    {new Date(certificate.created_at).toLocaleDateString()}
  </td>

  <td className="py-4">
    <button
      onClick={() =>
        openShareCertificate(
          certificate.certificate_path,
          certificate.certificate_name
        )
      }
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
              <div>
  <label className="text-sm font-bold text-slate-600">
    Upload Payment Receipt
  </label>

  <input
    type="file"
    accept="image/*,.pdf"
    onChange={(event) =>
      setPaymentReceipt(event.target.files?.[0] || null)
    }
    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
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
        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
  <CardContent className="p-8">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-[#0D2D6E]">
          My Funding Applications
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Track your business funding requests and review progress.
        </p>
      </div>

      <Link href="/apply">
        <Button className="px-5 py-3 bg-[var(--capd-green)] hover:opacity-90">
          New Application
        </Button>
      </Link>
    </div>

    {fundingApplications.length === 0 ? (
      <p className="mt-6 font-semibold text-slate-600">
        You have not submitted any funding applications yet.
      </p>
    ) : (
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
              <th className="py-4">Business</th>
              <th className="py-4">Type</th>
              <th className="py-4">Requested</th>
              <th className="py-4">Daily Revenue</th>
              <th className="py-4">Status</th>
              <th className="py-4">Officer</th>
              <th className="py-4">Date</th>
            </tr>
          </thead>

          <tbody>
            {fundingApplications.map((application) => (
              <tr key={application.id} className="border-b">
                <td className="py-4 font-bold text-[#0D2D6E]">
                  {application.business_name}
                </td>

                <td className="py-4 text-slate-600">
                  {application.business_type}
                </td>

                <td className="py-4 font-bold">
                  FCFA {Number(application.requested_amount).toLocaleString()}
                </td>

                <td className="py-4 font-bold">
                  FCFA{" "}
                  {Number(
                    application.daily_revenue_estimate
                  ).toLocaleString()}
                </td>

                <td className="py-4">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {application.application_status.replaceAll("_", " ")}
                  </span>
                </td>

                <td className="py-4 text-slate-600">
                  {application.assigned_officer || "Not assigned"}
                </td>

                <td className="py-4 text-slate-600">
                  {new Date(application.created_at).toLocaleDateString()}
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