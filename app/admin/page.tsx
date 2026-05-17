"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, FileCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string;
  payment_status: string;
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

type MemberRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  member_number: string | null;
  membership_status: string;
  total_shares: number;
  portfolio_value: number;
  declared_dividends: number;
  created_at: string;
  date_of_birth: string | null;
gender: string | null;
city: string | null;
national_id_number: string | null;
occupation: string | null;
business_name: string | null;
business_sector: string | null;
};

type BusinessApplication = {
  id: string;
  business_name: string;
  full_name: string;
  phone: string;
  business_type: string;
  requested_amount: number;
  daily_revenue_estimate: number;
  intended_use: string | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  assigned_officer: string | null;
  review_notes: string | null;
  application_status: string;
  created_at: string;
};

type ApplicationDocument = {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
};

const stats = [
  { title: "Registered Members", value: "members", icon: Users },
  { title: "Business Applications", value: "applications", icon: Building2 },
  { title: "Pending Payments", value: "payments", icon: CreditCard },
  { title: "Documents Uploaded", value: "documents", icon: FileCheck },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminError, setAdminError] = useState("");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [approvingId, setApprovingId] = useState("");

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("all");
  const [editingApplication, setEditingApplication] =
    useState<BusinessApplication | null>(null);
  const [savingApplication, setSavingApplication] = useState(false);

  const [applicationDocuments, setApplicationDocuments] = useState<
    ApplicationDocument[]
  >([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [newMemberShares, setNewMemberShares] = useState("");
  const [newMemberDividends, setNewMemberDividends] = useState("0");
  const [newMemberStatus, setNewMemberStatus] = useState("active");
  const [memberMessage, setMemberMessage] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const filteredApplications = useMemo(() => {
    const search = applicationSearch.toLowerCase();

    return applications.filter((application) => {
      const matchesSearch =
        application.business_name.toLowerCase().includes(search) ||
        application.full_name.toLowerCase().includes(search) ||
        application.phone.toLowerCase().includes(search);

      const matchesStatus =
        applicationStatusFilter === "all" ||
        application.application_status === applicationStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, applicationSearch, applicationStatusFilter]);

  useEffect(() => {
    async function checkAdminAccess() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const user = sessionData.session.user;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) {
        setAdminError("Unable to verify admin access.");
        setCheckingAdmin(false);
        return;
      }

      if (profile.role !== "admin" && profile.role !== "super_admin") {
        window.location.href = "/member";
        return;
      }

      setCheckingAdmin(false);
    }

    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (checkingAdmin || adminError) return;

    loadPayments();
    loadMembers();
    loadApplications();
  }, [checkingAdmin, adminError]);

  async function loadPayments() {
    setLoadingPayments(true);

    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        id,
        amount,
        payment_method,
        reference,
        payment_status,
        created_at,
        members (
          full_name,
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    setPayments((data as Payment[]) || []);
    setLoadingPayments(false);
  }
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
 async function loadMembers() {
  setLoadingMembers(true);

  const { data, error } = await supabase
    .from("members")
    .select(
      "id, full_name, email, phone, date_of_birth, gender, city, national_id_number, occupation, business_name, business_sector, member_number, membership_status, total_shares, portfolio_value, declared_dividends, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) console.error(error);

  setMembers((data as MemberRecord[]) || []);
  setLoadingMembers(false);
}
async function activateMember(memberId: string) {
  const { error } = await supabase
    .from("members")
    .update({ membership_status: "active" })
    .eq("id", memberId);

  if (error) {
    console.error(error);
    return;
  }

  setMembers((current) =>
    current.map((member) =>
      member.id === memberId
        ? { ...member, membership_status: "active" }
        : member
    )
  );
}

  async function loadApplications() {
    setLoadingApplications(true);

    const { data, error } = await supabase
      .from("business_applications")
      .select(
        `
        id,
        business_name,
        full_name,
        phone,
        business_type,
        requested_amount,
        daily_revenue_estimate,
        intended_use,
        guarantor_name,
        guarantor_phone,
        assigned_officer,
        review_notes,
        application_status,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    setApplications((data as BusinessApplication[]) || []);
    setLoadingApplications(false);
  }

  async function approvePayment(paymentId: string) {
    setApprovingId(paymentId);

    const paymentToApprove = payments.find((payment) => payment.id === paymentId);

    if (!paymentToApprove) {
      setApprovingId("");
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
      return;
    }

    if (paymentRecord.payment_status === "approved") {
      setApprovingId("");
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
      return;
    }

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({ payment_status: "approved" })
      .eq("id", paymentId);

    if (paymentUpdateError) {
      console.error(paymentUpdateError);
      setApprovingId("");
      return;
    }

    setPayments((current) =>
      current.map((payment) =>
        payment.id === paymentId
          ? { ...payment, payment_status: "approved" }
          : payment
      )
    );

    setApprovingId("");
  }

  async function createMember() {
    if (!newMemberName || !newMemberEmail || !newMemberNumber) {
      setMemberMessage("Please enter full name, email, and member number.");
      return;
    }

    setCreatingMember(true);
    setMemberMessage("");

    const response = await fetch("/api/create-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: newMemberName,
        email: newMemberEmail,
        phone: newMemberPhone,
        member_number: newMemberNumber,
        membership_status: newMemberStatus,
        total_shares: Number(newMemberShares || 0),
        declared_dividends: Number(newMemberDividends || 0),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMemberMessage(result.error || "Failed to create member.");
      setCreatingMember(false);
      return;
    }

    setMembers((current) => [result.member as MemberRecord, ...current]);

    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberPhone("");
    setNewMemberNumber("");
    setNewMemberShares("");
    setNewMemberDividends("0");
    setNewMemberStatus("active");

    setMemberMessage(
      `Member created successfully. Temporary password: ${result.temporaryPassword}`
    );

    setCreatingMember(false);
  }

  function startEditMember(member: MemberRecord) {
    setEditingMember(member);
  }

  async function saveMemberChanges() {
    if (!editingMember) return;

    setSavingMember(true);

    const recalculatedPortfolio = Number(editingMember.total_shares || 0) * 10000;

    const { error } = await supabase
      .from("members")
      .update({
        full_name: editingMember.full_name,
        email: editingMember.email,
        phone: editingMember.phone,
        membership_status: editingMember.membership_status,
        total_shares: Number(editingMember.total_shares),
        declared_dividends: Number(editingMember.declared_dividends),
        portfolio_value: recalculatedPortfolio,
      })
      .eq("id", editingMember.id);

    if (error) {
      setMemberMessage(error.message);
      setSavingMember(false);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === editingMember.id
          ? { ...editingMember, portfolio_value: recalculatedPortfolio }
          : member
      )
    );

    setMemberMessage("Member updated successfully.");
    setEditingMember(null);
    setSavingMember(false);
  }

  async function startEditApplication(application: BusinessApplication) {
    setEditingApplication(application);
    setLoadingDocuments(true);

    const { data, error } = await supabase
      .from("application_documents")
      .select("id, application_id, document_type, file_name, file_path, created_at")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    setApplicationDocuments((data as ApplicationDocument[]) || []);
    setLoadingDocuments(false);
  }

  async function saveApplicationChanges() {
    if (!editingApplication) return;

    setSavingApplication(true);

    const { error } = await supabase
      .from("business_applications")
      .update({
        assigned_officer: editingApplication.assigned_officer,
        review_notes: editingApplication.review_notes,
        application_status: editingApplication.application_status,
      })
      .eq("id", editingApplication.id);

    if (error) {
      console.error(error);
      setSavingApplication(false);
      return;
    }

    setApplications((current) =>
      current.map((application) =>
        application.id === editingApplication.id ? editingApplication : application
      )
    );

    setEditingApplication(null);
    setSavingApplication(false);
  }

  async function quickUpdateApplicationStatus(applicationId: string, status: string) {
    const { error } = await supabase
      .from("business_applications")
      .update({ application_status: status })
      .eq("id", applicationId);

    if (error) {
      console.error(error);
      return;
    }

    setApplications((current) =>
      current.map((application) =>
        application.id === applicationId
          ? { ...application, application_status: status }
          : application
      )
    );
  }

  async function openApplicationDocument(filePath: string) {
    const { data, error } = await supabase.storage
      .from("business-documents")
      .createSignedUrl(filePath, 60);

    if (error || !data?.signedUrl) {
      console.error(error);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-semibold text-slate-600">Checking admin access...</p>
      </main>
    );
  }

  if (adminError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-semibold text-red-600">{adminError}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
              Admin Control Centre
            </div>
          </div>

          <div className="flex gap-3">
  <Button
    className="px-5 py-3"
    variant="outline"
  >
    New Notice
  </Button>

  <Button
    onClick={handleLogout}
    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white"
  >
    Logout
  </Button>
</div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--capd-navy)] p-8 text-white shadow-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-20 h-72 w-72 rounded-full bg-[var(--capd-green)]/20" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-gold)]">
              Administration
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Cooperative Management Dashboard
            </h1>

            <p className="mt-4 max-w-3xl text-white/75">
              Manage members, payments, business applications, documents,
              approvals, and cooperative operations from one control centre.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Submitted Applications",
              value: applications.filter(
                (application) => application.application_status === "submitted"
              ).length,
            },
            {
              title: "Under Review",
              value: applications.filter(
                (application) =>
                  application.application_status === "under_review"
              ).length,
            },
            {
              title: "Field Verification",
              value: applications.filter(
                (application) =>
                  application.application_status === "field_verification"
              ).length,
            },
            {
              title: "Approved / Disbursed",
              value: applications.filter(
                (application) =>
                  application.application_status === "approved" ||
                  application.application_status === "disbursed"
              ).length,
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6">
                <p className="text-sm font-bold text-slate-500">{item.title}</p>
                <p className="mt-3 text-3xl font-black text-[#0D2D6E]">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ title, value, icon: Icon }) => (
            <Card key={title} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">{title}</p>
                    <p className="mt-3 text-3xl font-black text-[#0D2D6E]">
                      {value === "members"
                        ? members.length
                        : value === "applications"
                        ? applications.length
                        : value === "payments"
                        ? payments.filter(
                            (payment) => payment.payment_status === "pending"
                          ).length
                        : applicationDocuments.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--capd-navy)]/10 p-3 text-[var(--capd-navy)]">
                    <Icon size={22} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">
                  Payment Validation Queue
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Review member-submitted payments awaiting validation.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                {
                  payments.filter(
                    (payment) => payment.payment_status === "pending"
                  ).length
                }{" "}
                pending
              </div>
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
                <table className="w-full min-w-[850px] text-left text-sm">
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
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => {
                      const member = Array.isArray(payment.members)
                        ? payment.members[0]
                        : payment.members;

                      return (
                        <tr key={payment.id} className="border-b">
                          <td className="py-4 font-bold text-[var(--capd-navy)]">
                            {member?.full_name || "Unknown"}
                          </td>

                          <td className="py-4 text-slate-600">
                            {member?.email || "-"}
                          </td>

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

                          <td className="py-4">
                            {payment.payment_status === "pending" ? (
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
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                Approved
                              </span>
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

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">
                  Member Management
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  View registered cooperative members, share balances, portfolio
                  values, and membership status.
                </p>
              </div>

              <div className="rounded-2xl bg-[#0D2D6E]/10 px-4 py-2 text-sm font-bold text-[#0D2D6E]">
                {members.length} members
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-black text-[#0D2D6E]">
                Create New Member
              </h3>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <input
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Full name"
                />

                <input
                  value={newMemberEmail}
                  onChange={(event) => setNewMemberEmail(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Email"
                />

                <input
                  value={newMemberPhone}
                  onChange={(event) => setNewMemberPhone(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Phone"
                />

                <input
                  value={newMemberNumber}
                  onChange={(event) => setNewMemberNumber(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Member number e.g. CAP-M-0002"
                />

                <input
                  value={newMemberShares}
                  onChange={(event) => setNewMemberShares(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Initial shares"
                />

                <input
                  value={newMemberDividends}
                  onChange={(event) =>
                    setNewMemberDividends(event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="Declared dividends"
                />

                <select
                  value={newMemberStatus}
                  onChange={(event) => setNewMemberStatus(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {memberMessage && (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  {memberMessage}
                </div>
              )}

              <Button
                onClick={createMember}
                disabled={creatingMember}
                className="mt-6 px-6 py-3"
              >
                {creatingMember ? "Creating..." : "Create Member"}
              </Button>
            </div>

            {editingMember && (
              <div className="mt-8 rounded-3xl border border-[#0D2D6E]/20 bg-white p-6">
                <h3 className="text-xl font-black text-[#0D2D6E]">
                  Edit Member
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <input
                    value={editingMember.full_name}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        full_name: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Full name"
                  />

                  <input
                    value={editingMember.email}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        email: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Email"
                  />

                  <input
                    value={editingMember.phone || ""}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        phone: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Phone"
                  />

                  <input
                    value={editingMember.total_shares}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        total_shares: Number(event.target.value),
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Total shares"
                  />

                  <input
                    value={editingMember.declared_dividends}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        declared_dividends: Number(event.target.value),
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Declared dividends"
                  />

                  <select
                    value={editingMember.membership_status}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        membership_status: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Portfolio value will recalculate automatically at FCFA 10,000
                  per share.
                </p>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={saveMemberChanges}
                    disabled={savingMember}
                    className="px-6 py-3"
                  >
                    {savingMember ? "Saving..." : "Save Changes"}
                  </Button>

                  <button
                    onClick={() => setEditingMember(null)}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingMembers ? (
              <p className="mt-6 font-semibold text-slate-600">
                Loading members...
              </p>
            ) : members.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No members found.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Member</th>
                      <th className="py-4">Email</th>
                      <th className="py-4">Phone</th>
                      <th className="py-4">Member No.</th>
                      <th className="py-4">Shares</th>
                      <th className="py-4">Portfolio</th>
                      <th className="py-4">Dividends</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {member.full_name}
                        </td>

                        <td className="py-4 text-slate-600">{member.email}</td>

                        <td className="py-4 text-slate-600">
                          {member.phone || "-"}
                        </td>

                        <td className="py-4 text-slate-600">
                          {member.member_number || "-"}
                        </td>

                        <td className="py-4 font-bold">
                          {Number(member.total_shares || 0).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(member.portfolio_value || 0).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(
                            member.declared_dividends || 0
                          ).toLocaleString()}
                        </td>

                        <td className="py-4">
                          <span
                            className={
                              member.membership_status === "active"
                                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                            }
                          >
                            {member.membership_status}
                          </span>
                        </td>

                        <td className="py-4">
                          <Button
                            onClick={() => startEditMember(member)}
                            className="px-4 py-2"
                          >
                            Edit
                          </Button>
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
          Pending Membership Registrations
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Follow up with new members who registered online but have not yet been activated.
        </p>
      </div>

      <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
        {
          members.filter(
            (member) => member.membership_status === "pending"
          ).length
        }{" "}
        pending
      </div>
    </div>

    {members.filter((member) => member.membership_status === "pending")
      .length === 0 ? (
      <p className="mt-6 font-semibold text-slate-600">
        No pending membership registrations.
      </p>
    ) : (
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
              <th className="py-4">Name</th>
              <th className="py-4">Email</th>
              <th className="py-4">Phone</th>
              <th className="py-4">City</th>
              <th className="py-4">Gender</th>
              <th className="py-4">Occupation</th>
              <th className="py-4">Business</th>
              <th className="py-4">Sector</th>
              <th className="py-4">Date</th>
              <th className="py-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {members
              .filter((member) => member.membership_status === "pending")
              .map((member) => (
                <tr key={member.id} className="border-b">
                  <td className="py-4 font-bold text-[#0D2D6E]">
                    {member.full_name}
                  </td>

                  <td className="py-4 text-slate-600">{member.email}</td>

                  <td className="py-4 text-slate-600">{member.phone || "-"}</td>

                  <td className="py-4 text-slate-600">{member.city || "-"}</td>

                  <td className="py-4 text-slate-600">
                    {member.gender || "-"}
                  </td>

                  <td className="py-4 text-slate-600">
                    {member.occupation || "-"}
                  </td>

                  <td className="py-4 text-slate-600">
                    {member.business_name || "-"}
                  </td>

                  <td className="py-4 text-slate-600">
                    {member.business_sector || "-"}
                  </td>

                  <td className="py-4 text-slate-600">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4">
  <Button
    onClick={() => activateMember(member.id)}
    className="px-4 py-2"
  >
    Activate
  </Button>
</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0D2D6E]">
                  Business Application Review Queue
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <input
                    value={applicationSearch}
                    onChange={(event) =>
                      setApplicationSearch(event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Search business name, owner, or phone"
                  />

                  <select
                    value={applicationStatusFilter}
                    onChange={(event) =>
                      setApplicationStatusFilter(event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    <option value="all">All statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="field_verification">
                      Field Verification
                    </option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="disbursed">Disbursed</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0D2D6E]/10 px-4 py-2 text-sm font-bold text-[#0D2D6E]">
                {filteredApplications.length} applications
              </div>
            </div>

            {editingApplication && (
              <div className="mt-8 rounded-3xl border border-[#0D2D6E]/20 bg-white p-6">
                <h3 className="text-xl font-black text-[#0D2D6E]">
                  Review Application
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Business
                    </p>
                    <p className="mt-1 font-black text-[#0D2D6E]">
                      {editingApplication.business_name}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Owner
                    </p>
                    <p className="mt-1 font-black text-[#0D2D6E]">
                      {editingApplication.full_name}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Requested
                    </p>
                    <p className="mt-1 font-black text-[#0D2D6E]">
                      FCFA{" "}
                      {Number(
                        editingApplication.requested_amount || 0
                      ).toLocaleString()}
                    </p>
                  </div>

                  <input
                    value={editingApplication.assigned_officer || ""}
                    onChange={(event) =>
                      setEditingApplication({
                        ...editingApplication,
                        assigned_officer: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Assigned officer / Risk analyst"
                  />

                  <select
                    value={editingApplication.application_status}
                    onChange={(event) =>
                      setEditingApplication({
                        ...editingApplication,
                        application_status: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="field_verification">
                      Field Verification
                    </option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="disbursed">Disbursed</option>
                  </select>
                </div>

                <textarea
                  value={editingApplication.review_notes || ""}
                  onChange={(event) =>
                    setEditingApplication({
                      ...editingApplication,
                      review_notes: event.target.value,
                    })
                  }
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Review notes, field observations, risk comments..."
                />

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-lg font-black text-[#0D2D6E]">
                    Uploaded Documents
                  </h4>

                  {loadingDocuments ? (
                    <p className="mt-4 text-sm font-semibold text-slate-600">
                      Loading documents...
                    </p>
                  ) : applicationDocuments.length === 0 ? (
                    <p className="mt-4 text-sm font-semibold text-slate-600">
                      No documents uploaded for this application.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {applicationDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-widest text-[#009B5A]">
                            {document.document_type.replaceAll("_", " ")}
                          </p>

                          <p className="mt-2 text-sm font-bold text-slate-700">
                            {document.file_name}
                          </p>

                          <p className="mt-2 break-all text-xs text-slate-500">
                            {document.file_path}
                          </p>

                          <Button
                            onClick={() =>
                              openApplicationDocument(document.file_path)
                            }
                            className="mt-4 px-4 py-2 text-sm"
                          >
                            View Document
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={saveApplicationChanges}
                    disabled={savingApplication}
                    className="px-6 py-3"
                  >
                    {savingApplication ? "Saving..." : "Save Review"}
                  </Button>

                  <button
                    onClick={() => setEditingApplication(null)}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingApplications ? (
              <p className="mt-6 font-semibold text-slate-600">
                Loading applications...
              </p>
            ) : filteredApplications.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No business applications found.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Business</th>
                      <th className="py-4">Owner</th>
                      <th className="py-4">Phone</th>
                      <th className="py-4">Type</th>
                      <th className="py-4">Requested</th>
                      <th className="py-4">Daily Revenue</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Date</th>
                      <th className="py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr key={application.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {application.business_name}
                        </td>

                        <td className="py-4 text-slate-600">
                          {application.full_name}
                        </td>

                        <td className="py-4 text-slate-600">
                          {application.phone}
                        </td>

                        <td className="py-4 text-slate-600">
                          {application.business_type}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(
                            application.requested_amount || 0
                          ).toLocaleString()}
                        </td>

                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(
                            application.daily_revenue_estimate || 0
                          ).toLocaleString()}
                        </td>

                        <td className="py-4">
                          <select
                            value={application.application_status}
                            onChange={(event) =>
                              quickUpdateApplicationStatus(
                                application.id,
                                event.target.value
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="field_verification">
                              Field Verification
                            </option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="disbursed">Disbursed</option>
                          </select>
                        </td>

                        <td className="py-4 text-slate-600">
                          {new Date(application.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-4">
                          <Button
                            onClick={() => startEditApplication(application)}
                            className="px-4 py-2"
                          >
                            Review
                          </Button>
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