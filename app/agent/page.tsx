"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import {
  LogOut,
  Users,
  WalletCards,
  PiggyBank,
  BadgeDollarSign,
  LayoutDashboard,
} from "lucide-react";

type Agent = {
  id: string;
  full_name: string;
  agent_code: string;
  phone: string | null;
  email: string | null;
  role: string;
  team_id: string | null;
  commission_rate: number;
  status: string;
  daily_target: number | null;
  weekly_target: number | null;
  monthly_target: number | null;
  agent_teams?: {
    id: string;
    team_name: string;
    team_code: string | null;
    region: string | null;
  } | null;
};

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
  phone: string | null;
};

type Collection = {
  id: string;
  collection_type: string;
  expected_amount: number;
  collected_amount: number;
  variance: number;
  payment_method: string | null;
  status: string;
  collection_date: string;
  created_at: string;
  members?: Member | null;
};

type Commission = {
  id: string;
  commission_type: string;
  base_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  members?: {
    full_name: string;
    member_number: string | null;
  } | null;
};

export default function AgentPortal() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [memberId, setMemberId] = useState("");
  const [collectionType, setCollectionType] = useState("savings");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAgentPortal();
  }, []);

  async function loadAgentPortal() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

  const { data: agentData, error: agentError } = await supabase
  .from("agents")
  .select(
    "id, full_name, agent_code, phone, email, role, team_id, commission_rate, status, daily_target, weekly_target, monthly_target"
  )
  .eq("auth_user_id", userData.user.id)
  .maybeSingle();

    if (agentError || !agentData) {
      console.error(agentError);
      setLoading(false);
      return;
    }

    if (agentData.status !== "active") {
      setMessage("Your agent account is not active.");
      setLoading(false);
      return;
    }

    const cleanAgent = agentData as unknown as Agent;
    setAgent(cleanAgent);

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, member_number, phone")
      .eq("registered_by_agent_id", cleanAgent.id)
      .order("full_name", { ascending: true });

    if (memberError) console.error(memberError);
    setMembers(memberData || []);

    const { data: collectionData, error: collectionError } = await supabase
      .from("collections")
      .select(`
        id,
        collection_type,
        expected_amount,
        collected_amount,
        variance,
        payment_method,
        status,
        collection_date,
        created_at,
        members (
          id,
          full_name,
          member_number,
          phone
        )
      `)
      .eq("agent_id", cleanAgent.id)
      .order("created_at", { ascending: false });

    if (collectionError) console.error(collectionError);
    setCollections((collectionData as unknown as Collection[]) || []);

    const { data: commissionData, error: commissionError } = await supabase
      .from("agent_commissions")
      .select(`
        id,
        commission_type,
        base_amount,
        commission_rate,
        commission_amount,
        status,
        created_at,
        members (
          full_name,
          member_number
        )
      `)
      .eq("agent_id", cleanAgent.id)
      .order("created_at", { ascending: false });

    if (commissionError) console.error(commissionError);
    setCommissions((commissionData as unknown as Commission[]) || []);

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function recordCollection() {
    if (!agent || !memberId || !collectionType) {
      setMessage("Member and collection type are required.");
      return;
    }

    const expected = Number(expectedAmount || 0);
    const collected = Number(collectedAmount || 0);

    if (Number.isNaN(expected) || Number.isNaN(collected)) {
      setMessage("Expected and collected amounts must be valid numbers.");
      return;
    }

    const { error } = await supabase.from("collections").insert({
      member_id: memberId,
      agent_id: agent.id,
      team_id: agent.team_id || null,
      collection_type: collectionType,
      expected_amount: expected,
      collected_amount: collected,
      payment_method: paymentMethod,
      reference: reference.trim() || null,
      status: "pending",
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Collection recorded successfully.");
    setMemberId("");
    setCollectionType("savings");
    setExpectedAmount("");
    setCollectedAmount("");
    setPaymentMethod("cash");
    setReference("");
    setNotes("");

    await loadAgentPortal();
  }

  const today = new Date().toISOString().slice(0, 10);

  const todayCollections = useMemo(() => {
    return collections.filter((item) => item.collection_date === today);
  }, [collections, today]);

  const todayExpected = todayCollections.reduce(
    (sum, item) => sum + Number(item.expected_amount || 0),
    0
  );

  const todayCollected = todayCollections.reduce(
    (sum, item) => sum + Number(item.collected_amount || 0),
    0
  );

  const pendingCommission = commissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  const totalCommission = commissions.reduce(
    (sum, item) => sum + Number(item.commission_amount || 0),
    0
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-lg font-semibold text-slate-600">
          Loading agent portal...
        </p>
      </main>
    );
  }

  if (!agent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-black text-[#0D2D6E]">
            Agent record not found
          </h1>
          <p className="mt-4 text-slate-600">
            Your login is valid, but no agent record is linked to this account.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 rounded-2xl bg-[#0D2D6E] px-6 py-3 font-bold text-white"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  const metrics = [
    {
      title: "My Registered Members",
      value: members.length.toString(),
      note: "Members attributed to you",
      icon: Users,
    },
    {
      title: "Today's Collections",
      value: `FCFA ${todayCollected.toLocaleString()}`,
      note: `Expected: FCFA ${todayExpected.toLocaleString()}`,
      icon: WalletCards,
    },
    {
      title: "Pending Commission",
      value: `FCFA ${pendingCommission.toLocaleString()}`,
      note: "Awaiting payout",
      icon: BadgeDollarSign,
    },
    {
      title: "Total Commission",
      value: `FCFA ${totalCommission.toLocaleString()}`,
      note: "All-time generated",
      icon: PiggyBank,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
              Agent Portal
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0D2D6E] p-8 text-white shadow-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-20 h-72 w-72 rounded-full bg-[#009B5A]/20" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-widest text-white/70">
              Field Operations
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Welcome, {agent.full_name}
            </h1>

            <p className="mt-4 max-w-2xl text-white/75">
              Agent Code: {agent.agent_code} · Team ID: {agent.team_id || "No team assigned"}· Role:{" "}
              {agent.role}
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
                    <p className="mt-3 text-2xl font-black text-[#0D2D6E]">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{note}</p>
                  </div>

                  <div className="rounded-2xl bg-[#0D2D6E]/10 p-3 text-[#0D2D6E]">
                    <Icon size={23} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {message && (
          <div className="mt-8 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            {message}
          </div>
        )}

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              Record Collection
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Record daily collections for members assigned to you.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.member_number || "No number"})
                  </option>
                ))}
              </select>

              <select
                value={collectionType}
                onChange={(e) => setCollectionType(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              >
                <option value="savings">Savings</option>
                <option value="loan">Aid Repayment</option>
                <option value="share">Share Subscription</option>
              </select>

              <input
                type="number"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                placeholder="Expected amount"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />

              <input
                type="number"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                placeholder="Collected amount"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="mtn_momo">MTN Mobile Money</option>
                <option value="orange_money">Orange Money</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>

              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Reference optional"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optional"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none md:col-span-2"
              />
            </div>

            <Button onClick={recordCollection} className="mt-6 px-6 py-3">
              Record Collection
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-8 border-slate-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              My Recent Collections
            </h2>

            {collections.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No collections recorded yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Member</th>
                      <th className="py-4">Type</th>
                      <th className="py-4">Expected</th>
                      <th className="py-4">Collected</th>
                      <th className="py-4">Variance</th>
                      <th className="py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {collections.slice(0, 15).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {item.members?.full_name || "-"}
                        </td>
                        <td className="py-4 capitalize">
                          {item.collection_type}
                        </td>
                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(item.expected_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-4 font-bold">
                          FCFA{" "}
                          {Number(item.collected_amount || 0).toLocaleString()}
                        </td>
                        <td
                          className={
                            Number(item.variance || 0) < 0
                              ? "py-4 font-black text-red-600"
                              : "py-4 font-black text-green-700"
                          }
                        >
                          FCFA {Number(item.variance || 0).toLocaleString()}
                        </td>
                        <td className="py-4 text-slate-600">
                          {new Date(item.created_at).toLocaleDateString()}
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
            <h2 className="text-2xl font-black text-[#0D2D6E]">
              My Commissions
            </h2>

            {commissions.length === 0 ? (
              <p className="mt-6 font-semibold text-slate-600">
                No commissions generated yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-4">Member</th>
                      <th className="py-4">Type</th>
                      <th className="py-4">Base</th>
                      <th className="py-4">Rate</th>
                      <th className="py-4">Commission</th>
                      <th className="py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {commissions.slice(0, 15).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4 font-bold text-[#0D2D6E]">
                          {item.members?.full_name || "-"}
                        </td>
                        <td className="py-4">{item.commission_type}</td>
                        <td className="py-4">
                          FCFA {Number(item.base_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-4">
                          {Number(item.commission_rate || 0)}%
                        </td>
                        <td className="py-4 font-black">
                          FCFA{" "}
                          {Number(item.commission_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span
                            className={
                              item.status === "paid"
                                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                            }
                          >
                            {item.status}
                          </span>
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