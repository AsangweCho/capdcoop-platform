"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
};

type Agent = {
  id: string;
  full_name: string;
  agent_code: string;
  team_id: string | null;
};

type Team = {
  id: string;
  team_name: string;
  team_code: string | null;
};

type Collection = {
  id: string;
  collection_type: string;
  expected_amount: number;
  collected_amount: number;
  variance: number;
  payment_method: string | null;
  reference: string | null;
  status: string;
  notes: string | null;
  collection_date: string;
  created_at: string;
  members?: Member | null;
  agents?: Agent | null;
  agent_teams?: Team | null;
};

export default function CollectionsModule() {
  const [members, setMembers] = useState<Member[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [message, setMessage] = useState("");

  const [memberId, setMemberId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [collectionType, setCollectionType] = useState("savings");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadMembers(), loadAgents(), loadTeams(), loadCollections()]);
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, member_number")
      .order("full_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers(data || []);
  }

  async function loadAgents() {
    const { data, error } = await supabase
      .from("agents")
      .select("id, full_name, agent_code, team_id")
      .eq("status", "active")
      .order("full_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAgents(data || []);
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from("agent_teams")
      .select("id, team_name, team_code")
      .eq("status", "active")
      .order("team_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTeams(data || []);
  }

  async function loadCollections() {
    const { data, error } = await supabase
      .from("collections")
      .select(`
        *,
        members (
          id,
          full_name,
          member_number
        ),
        agents (
          id,
          full_name,
          agent_code,
          team_id
        ),
        agent_teams (
          id,
          team_name,
          team_code
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setCollections([]);
      return;
    }

    setCollections((data as unknown as Collection[]) || []);
  }

  function handleAgentChange(value: string) {
    setAgentId(value);

    const selectedAgent = agents.find((agent) => agent.id === value);

    if (selectedAgent?.team_id) {
      setTeamId(selectedAgent.team_id);
    }
  }

  async function recordCollection() {
    if (!memberId || !agentId || !collectionType) {
      setMessage("Member, agent, and collection type are required.");
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
      agent_id: agentId,
      team_id: teamId || null,
      collection_type: collectionType,
      expected_amount: expected,
      collected_amount: collected,
      payment_method: paymentMethod,
      reference: reference.trim() || null,
      status: "recorded",
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Collection recorded successfully.");
    setMemberId("");
    setAgentId("");
    setTeamId("");
    setCollectionType("savings");
    setExpectedAmount("");
    setCollectedAmount("");
    setPaymentMethod("cash");
    setReference("");
    setNotes("");
    await loadCollections();
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

  const todayVariance = todayCollected - todayExpected;

  const savingsTotal = todayCollections
    .filter((item) => item.collection_type === "savings")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const loanTotal = todayCollections
    .filter((item) => item.collection_type === "loan")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const shareTotal = todayCollections
    .filter((item) => item.collection_type === "share")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Today's Expected"
          value={`FCFA ${todayExpected.toLocaleString()}`}
        />
        <MetricCard
          title="Today's Collected"
          value={`FCFA ${todayCollected.toLocaleString()}`}
        />
        <MetricCard
          title="Today's Variance"
          value={`FCFA ${todayVariance.toLocaleString()}`}
        />
        <MetricCard
          title="Savings Collected"
          value={`FCFA ${savingsTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Loan Collections"
          value={`FCFA ${loanTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Share Collections"
          value={`FCFA ${shareTotal.toLocaleString()}`}
        />
      </div>

      {message && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {message}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Record Daily Collection
          </h2>

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
              value={agentId}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="">Select Agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name} ({agent.agent_code})
                </option>
              ))}
            </select>

            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="">Select Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name} ({team.team_code || "No code"})
                </option>
              ))}
            </select>

            <select
              value={collectionType}
              onChange={(e) => setCollectionType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="savings">Savings</option>
              <option value="loan">Loan Repayment</option>
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />
          </div>

          <Button onClick={recordCollection} className="mt-6 px-6 py-3">
            Record Collection
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Today's Collections
          </h2>

          {todayCollections.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No collections recorded today.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Member</th>
                    <th className="py-4">Agent</th>
                    <th className="py-4">Team</th>
                    <th className="py-4">Type</th>
                    <th className="py-4">Expected</th>
                    <th className="py-4">Collected</th>
                    <th className="py-4">Variance</th>
                    <th className="py-4">Method</th>
                    <th className="py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {todayCollections.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {item.members?.full_name || "-"}
                      </td>
                      <td className="py-4">
                        {item.agents?.full_name || "-"}
                      </td>
                      <td className="py-4">
                        {item.agent_teams?.team_name || "-"}
                      </td>
                      <td className="py-4 capitalize">
                        {item.collection_type}
                      </td>
                      <td className="py-4 font-bold">
                        FCFA {Number(item.expected_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 font-bold">
                        FCFA {Number(item.collected_amount || 0).toLocaleString()}
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
                      <td className="py-4">{item.payment_method || "-"}</td>
                      <td className="py-4">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#0D2D6E]">{value}</p>
    </div>
  );
}