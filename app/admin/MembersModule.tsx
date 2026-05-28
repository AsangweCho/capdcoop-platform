"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MemberRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_card_number: string | null;
  member_number: string | null;
  membership_status: string | null;
  total_shares: number | null;
  portfolio_value: number | null;
  declared_dividends: number | null;
  agent_code: string | null;
  registered_by_agent_name: string | null;
  registered_by_agent_id: string | null;
  created_at: string | null;
  share_certificate?: {
    id: string;
    certificate_name: string;
    certificate_path: string;
    created_at?: string | null;
  }[] | null;
};

export default function MembersModule({ currentAdmin }: { currentAdmin: any }) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberIdCard, setNewMemberIdCard] = useState("");
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [newMemberShares, setNewMemberShares] = useState("");
  const [newMemberDividends, setNewMemberDividends] = useState("0");
  const [newMemberStatus, setNewMemberStatus] = useState("active");
  const [newAgentCode, setNewAgentCode] = useState("");
  const [newAgentName, setNewAgentName] = useState("");

  const [memberMessage, setMemberMessage] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [uploadingCertificateFor, setUploadingCertificateFor] = useState("");

  const pendingMembers = members.filter(
  (member) => member.membership_status === "pending"
);

  const canManageMembers =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "membership_officer" ||
    currentAdmin?.role === "membership_certificate_officer";

  const canManageCertificates =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "certificate_officer" ||
    currentAdmin?.role === "membership_certificate_officer";

  async function loadMembers() {
    setLoadingMembers(true);

    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        email,
        phone,
        id_card_number,
        member_number,
        membership_status,
        total_shares,
        portfolio_value,
        declared_dividends,
        agent_code,
        registered_by_agent_name,
        registered_by_agent_id,
        created_at,
        share_certificate:share_certificates(
          id,
          certificate_name,
          certificate_path,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MEMBERS LOAD ERROR:", error);
      setMemberMessage(error.message);
      setMembers([]);
      setLoadingMembers(false);
      return;
    }

    setMembers((data as MemberRecord[]) || []);
    setLoadingMembers(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function validateNewMember() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newMemberName.trim()) return "Full name is required.";
    if (!newMemberEmail.trim()) return "Email is required.";
    if (!emailRegex.test(newMemberEmail.trim())) return "Enter a valid email.";
    if (!newMemberNumber.trim()) return "Member number is required.";

    const shares = Number(newMemberShares || 0);
    const dividends = Number(newMemberDividends || 0);

    if (Number.isNaN(shares) || shares < 0) {
      return "Initial shares must be a valid number and cannot be negative.";
    }

    if (Number.isNaN(dividends) || dividends < 0) {
      return "Declared dividends must be a valid number and cannot be negative.";
    }

    return "";
  }

  async function createMember() {
    if (!canManageMembers) {
      setMemberMessage("You do not have permission to create members.");
      return;
    }

    const validationError = validateNewMember();

    if (validationError) {
      setMemberMessage(validationError);
      return;
    }

    setCreatingMember(true);
    setMemberMessage("");

    try {
      const response = await fetch("/api/create-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: newMemberName.trim(),
          email: newMemberEmail.trim().toLowerCase(),
          phone: newMemberPhone.trim(),
          id_card_number: newMemberIdCard.trim(),
          member_number: newMemberNumber.trim(),
          membership_status: newMemberStatus,
          total_shares: Number(newMemberShares || 0),
          declared_dividends: Number(newMemberDividends || 0),
          agent_code: newAgentCode.trim() || null,
          registered_by_agent_name: newAgentName.trim() || null,
          registered_by_agent_id: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMemberMessage(result.error || "Failed to create member.");
        setCreatingMember(false);
        return;
      }

      setMemberMessage(
        `Member created successfully. Temporary password: ${result.temporaryPassword}`
      );

      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPhone("");
      setNewMemberIdCard("");
      setNewMemberNumber("");
      setNewMemberShares("");
      setNewMemberDividends("0");
      setNewMemberStatus("active");
      setNewAgentCode("");
      setNewAgentName("");

      await loadMembers();
    } catch (error: any) {
      console.error(error);
      setMemberMessage(error.message || "Failed to create member.");
    } finally {
      setCreatingMember(false);
    }
  }

  function startEditMember(member: MemberRecord) {
    setEditingMember(member);
  }

 async function saveMemberChanges() {
  if (!editingMember) return;

  if (!editingMember.full_name?.trim()) {
    setMemberMessage("Full name is required.");
    return;
  }

  if (!editingMember.email?.trim()) {
    setMemberMessage("Email is required.");
    return;
  }

  setSavingMember(true);
  setMemberMessage("");

  const recalculatedPortfolio = Number(editingMember.total_shares || 0) * 10000;

  const { data, error } = await supabase
    .from("members")
    .update({
      full_name: editingMember.full_name.trim(),
      email: editingMember.email.trim().toLowerCase(),
      phone: editingMember.phone || null,
      id_card_number: editingMember.id_card_number || null,
      membership_status: editingMember.membership_status || "active",
      total_shares: Number(editingMember.total_shares || 0),
      declared_dividends: Number(editingMember.declared_dividends || 0),
      portfolio_value: recalculatedPortfolio,
      agent_code: editingMember.agent_code || null,
      registered_by_agent_name: editingMember.registered_by_agent_name || null,
      registered_by_agent_id: editingMember.registered_by_agent_id || null,
    })
    .eq("id", editingMember.id)
    .select()
    .single();

  if (error) {
    setMemberMessage(error.message);
    setSavingMember(false);
    return;
  }

  if (!data) {
    setMemberMessage("No member record was updated. Please check permissions.");
    setSavingMember(false);
    return;
  }

  setMemberMessage("Member updated successfully.");
  setEditingMember(null);
  setSavingMember(false);
  await loadMembers();
}

  async function uploadShareCertificate(member: MemberRecord, file: File | null) {
    if (!member?.id) {
      alert("Member not found.");
      return;
    }

    if (!file) {
      alert("No file selected.");
      return;
    }

    setUploadingCertificateFor(member.id);

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${member.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("share-certificates")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: certificateDbError } = await supabase
        .from("share_certificates")
        .insert({
          member_id: member.id,
          certificate_name: safeFileName,
          certificate_path: filePath,
          uploaded_by: currentAdmin?.id || null,
        });

      if (certificateDbError) throw certificateDbError;

      setMemberMessage("Share certificate uploaded successfully.");
      await loadMembers();
    } catch (error: any) {
      console.error("Certificate upload failed:", error);
      setMemberMessage(error.message || "Certificate upload failed.");
    } finally {
      setUploadingCertificateFor("");
    }
  }

async function approvePendingMember(member: MemberRecord) {
  if (!canManageMembers) {
    setMemberMessage("You do not have permission to approve members.");
    return;
  }

  const confirmed = window.confirm(`Approve ${member.full_name} as an active member?`);
  if (!confirmed) return;

  const { error } = await supabase
    .from("members")
    .update({
      membership_status: "active",
      must_change_password: true,
    })
    .eq("id", member.id);

  if (error) {
    setMemberMessage(error.message);
    return;
  }

  setMemberMessage("Member approved successfully.");
  await loadMembers();
}


  async function deleteShareCertificate(
    certificateId: string,
    certificatePath: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this certificate?"
    );

    if (!confirmed) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("share-certificates")
        .remove([certificatePath]);

      if (storageError) console.error(storageError);

      const { error: dbError } = await supabase
        .from("share_certificates")
        .delete()
        .eq("id", certificateId);

      if (dbError) throw dbError;

      setMemberMessage("Certificate deleted successfully.");
      await loadMembers();
    } catch (error: any) {
      console.error(error);
      setMemberMessage(error.message || "Failed to delete certificate.");
    }
  }

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              Member Management
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create members, assign agent attribution, and manage cooperative records.
            </p>
            <p className="text-sm font-bold text-amber-700">
  Pending membership applications: {pendingMembers.length}
</p>
          </div>

          <div className="rounded-2xl bg-[#0D2D6E]/10 px-4 py-2 text-sm font-bold text-[#0D2D6E]">
            {members.length} members
          </div>
        </div>

        {canManageMembers && (
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
                value={newMemberIdCard}
                onChange={(event) => setNewMemberIdCard(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="National ID / ID Card Number"
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
                onChange={(event) => setNewMemberDividends(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Declared dividends"
              />

              <input
                value={newAgentCode}
                onChange={(event) => setNewAgentCode(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Agent code e.g. CAPD-AG-001"
              />

              <input
                value={newAgentName}
                onChange={(event) => setNewAgentName(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Registered by agent name"
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
        )}

        {editingMember && (
          <div className="mt-8 rounded-3xl border border-[#0D2D6E]/20 bg-white p-6">
            <h3 className="text-xl font-black text-[#0D2D6E]">Edit Member</h3>

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
                value={editingMember.email || ""}
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
                value={editingMember.id_card_number || ""}
                onChange={(event) =>
                  setEditingMember({
                    ...editingMember,
                    id_card_number: event.target.value,
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                placeholder="National ID / ID Card Number"
              />

              <input
                value={editingMember.total_shares ?? ""}
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
                value={editingMember.declared_dividends ?? ""}
                onChange={(event) =>
                  setEditingMember({
                    ...editingMember,
                    declared_dividends: Number(event.target.value),
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                placeholder="Declared dividends"
              />

              <input
                value={editingMember.agent_code || ""}
                onChange={(event) =>
                  setEditingMember({
                    ...editingMember,
                    agent_code: event.target.value,
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                placeholder="Agent code"
              />

              <input
                value={editingMember.registered_by_agent_name || ""}
                onChange={(event) =>
                  setEditingMember({
                    ...editingMember,
                    registered_by_agent_name: event.target.value,
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                placeholder="Registered by agent"
              />

              <select
                value={editingMember.membership_status || ""}
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
              Portfolio value will recalculate automatically at FCFA 10,000 per share.
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
          <p className="mt-6 font-semibold text-slate-600">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="mt-6 font-semibold text-slate-600">No members found.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Name</th>
                  <th className="py-4">Email</th>
                  <th className="py-4">Phone</th>
                  <th className="py-4">ID Card</th>
                  <th className="py-4">Member #</th>
                  <th className="py-4">Agent Code</th>
                  <th className="py-4">Agent</th>
                  <th className="py-4">Shares</th>
                  <th className="py-4">Portfolio</th>
                  <th className="py-4">Dividends</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Created</th>
                  <th className="py-4">Action</th>
                  <th className="py-4">Cert</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {member.full_name}
                    </td>
                    <td className="py-4 text-slate-600">{member.email || "-"}</td>
                    <td className="py-4 text-slate-600">{member.phone || "-"}</td>
                    <td className="py-4 text-slate-600">
                      {member.id_card_number || "-"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {member.member_number || "-"}
                    </td>
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {member.agent_code || "-"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {member.registered_by_agent_name || "-"}
                    </td>
                    <td className="py-4 font-bold">
                      {Number(member.total_shares || 0).toLocaleString()}
                    </td>
                    <td className="py-4 font-bold">
                      FCFA {Number(member.portfolio_value || 0).toLocaleString()}
                    </td>
                    <td className="py-4 font-bold">
                      FCFA{" "}
                      {Number(member.declared_dividends || 0).toLocaleString()}
                    </td>
                    <td className="py-4 text-slate-600">
                      {member.membership_status || "-"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-4">
                      {canManageMembers ? (
                        <Button
                          onClick={() => startEditMember(member)}
                          className="px-4 py-2"
                        >
                          Edit
                        </Button>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          No access
                        </span>
                      )}
                      {member.membership_status === "pending" && (
  <Button
    onClick={() => approvePendingMember(member)}
    className="px-4 py-2 bg-[#009B5A] hover:opacity-90"
  >
    Approve
  </Button>
)}
                    </td>

                    <td className="py-4">
                      {canManageCertificates ? (
                        <div className="flex flex-col gap-2">
                          <label className="inline-block cursor-pointer rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-green-800">
                            {uploadingCertificateFor === member.id
                              ? "Uploading..."
                              : "Upload / Replace"}

                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploadingCertificateFor === member.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (!file) return;
                                uploadShareCertificate(member, file);
                              }}
                              className="hidden"
                            />
                          </label>

                          {Array.isArray(member.share_certificate) &&
                          member.share_certificate.length > 0 ? (
                            <button
                              onClick={() => {
                                const certificate = member.share_certificate?.[0];
                                if (!certificate) return;

                                deleteShareCertificate(
                                  certificate.id,
                                  certificate.certificate_path
                                );
                              }}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              Delete Certificate
                            </button>
                          ) : null}
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
  );
}