"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  agent_id: string | null;
  team_id: string | null;
  collection_type: string;
  expected_amount: number;
  collected_amount: number;
  variance: number;
  status: string;
  collection_date: string;
  created_at: string;
  agents?: Agent | null;
  agent_teams?: Team | null;
};

type CashHandover = {
  id: string;
  agent_id: string | null;
  team_id: string | null;
  handover_date: string;
  expected_amount: number;
  handed_over_amount: number;
  variance: number;
  payment_method: string | null;
  received_by: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  agents?: Agent | null;
  agent_teams?: Team | null;
};

export default function CommandCentreModule() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [message, setMessage] = useState("");

  const [agentId, setAgentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [handedOverAmount, setHandedOverAmount] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadAgents(), loadTeams(), loadCollections(), loadHandovers()]);
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
        id,
        agent_id,
        team_id,
        collection_type,
        expected_amount,
        collected_amount,
        variance,
        status,
        collection_date,
        created_at,
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

  async function loadHandovers() {
    const { data, error } = await supabase
      .from("cash_handovers")
      .select(`
        *,
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
      setHandovers([]);
      return;
    }

    setHandovers((data as unknown as CashHandover[]) || []);
  }

  function handleAgentChange(value: string) {
    setAgentId(value);

    const selectedAgent = agents.find((agent) => agent.id === value);

    if (selectedAgent?.team_id) {
      setTeamId(selectedAgent.team_id);
    }

    const today = new Date().toISOString().slice(0, 10);
    const agentApprovedToday = collections.filter(
      (item) =>
        item.agent_id === value &&
        item.collection_date === today &&
        item.status === "approved"
    );

    const expected = agentApprovedToday.reduce(
      (sum, item) => sum + Number(item.collected_amount || 0),
      0
    );

    setExpectedAmount(expected.toString());
  }

  async function createHandover() {
    if (!agentId) {
      setMessage("Select an agent.");
      return;
    }

    const expected = Number(expectedAmount || 0);
    const handed = Number(handedOverAmount || 0);

    if (Number.isNaN(expected) || Number.isNaN(handed)) {
      setMessage("Expected and handed over amounts must be valid numbers.");
      return;
    }

    const { error } = await supabase.from("cash_handovers").insert({
      agent_id: agentId,
      team_id: teamId || null,
      expected_amount: expected,
      handed_over_amount: handed,
      payment_method: paymentMethod,
      received_by: receivedBy.trim() || null,
      status: "pending",
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Cash handover recorded for approval.");
    setAgentId("");
    setTeamId("");
    setExpectedAmount("");
    setHandedOverAmount("");
    setReceivedBy("");
    setPaymentMethod("cash");
    setNotes("");
    await loadHandovers();
  }

  async function approveHandover(handover: CashHandover) {
    const confirmed = window.confirm("Approve this cash handover?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("cash_handovers")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", handover.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Cash handover approved.");
    await loadHandovers();
  }

  async function rejectHandover(handover: CashHandover) {
    const confirmed = window.confirm("Reject this cash handover?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("cash_handovers")
      .update({
        status: "rejected",
      })
      .eq("id", handover.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Cash handover rejected.");
    await loadHandovers();
  }

  const today = new Date().toISOString().slice(0, 10);

  const todayCollections = useMemo(() => {
    return collections.filter((item) => item.collection_date === today);
  }, [collections, today]);

  const approvedTodayCollections = todayCollections.filter(
    (item) => item.status === "approved"
  );

  const pendingCollections = todayCollections.filter(
    (item) => item.status === "pending"
  );

  const approvedHandoversToday = handovers.filter(
    (item) => item.handover_date === today && item.status === "approved"
  );

  const pendingHandovers = handovers.filter((item) => item.status === "pending");

  const todayExpected = approvedTodayCollections.reduce(
    (sum, item) => sum + Number(item.expected_amount || 0),
    0
  );

  const todayCollected = approvedTodayCollections.reduce(
    (sum, item) => sum + Number(item.collected_amount || 0),
    0
  );

  const todayVariance = todayCollected - todayExpected;

  const cashHandedOver = approvedHandoversToday.reduce(
    (sum, item) => sum + Number(item.handed_over_amount || 0),
    0
  );

  const treasuryVariance = cashHandedOver - todayCollected;

  const savingsCollected = approvedTodayCollections
    .filter((item) => item.collection_type === "savings")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const loanCollected = approvedTodayCollections
    .filter((item) => item.collection_type === "loan")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const shareCollected = approvedTodayCollections
    .filter((item) => item.collection_type === "share")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const agentPerformance = useMemo(() => {
    return agents.map((agent) => {
      const agentCollections = approvedTodayCollections.filter(
        (item) => item.agent_id === agent.id
      );

      const pending = pendingCollections.filter(
        (item) => item.agent_id === agent.id
      );

      const agentHandovers = approvedHandoversToday.filter(
        (item) => item.agent_id === agent.id
      );

      const expected = agentCollections.reduce(
        (sum, item) => sum + Number(item.expected_amount || 0),
        0
      );

      const collected = agentCollections.reduce(
        (sum, item) => sum + Number(item.collected_amount || 0),
        0
      );

      const handed = agentHandovers.reduce(
        (sum, item) => sum + Number(item.handed_over_amount || 0),
        0
      );

      return {
        agent,
        expected,
        collected,
        variance: collected - expected,
        pendingCount: pending.length,
        handed,
        treasuryVariance: handed - collected,
      };
    });
  }, [agents, approvedTodayCollections, pendingCollections, approvedHandoversToday]);

  const teamPerformance = useMemo(() => {
    return teams.map((team) => {
      const teamCollections = approvedTodayCollections.filter(
        (item) => item.team_id === team.id
      );

      const expected = teamCollections.reduce(
        (sum, item) => sum + Number(item.expected_amount || 0),
        0
      );

      const collected = teamCollections.reduce(
        (sum, item) => sum + Number(item.collected_amount || 0),
        0
      );

      return {
        team,
        expected,
        collected,
        variance: collected - expected,
      };
    });
  }, [teams, approvedTodayCollections]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Expected Today" value={`FCFA ${todayExpected.toLocaleString()}`} />
        <MetricCard title="Collected Today" value={`FCFA ${todayCollected.toLocaleString()}`} />
        <MetricCard title="Collection Variance" value={`FCFA ${todayVariance.toLocaleString()}`} />
        <MetricCard title="Pending Collections" value={pendingCollections.length.toString()} />
        <MetricCard title="Savings" value={`FCFA ${savingsCollected.toLocaleString()}`} />
        <MetricCard title="Aid Repayments" value={`FCFA ${loanCollected.toLocaleString()}`} />
        <MetricCard title="Shares" value={`FCFA ${shareCollected.toLocaleString()}`} />
        <MetricCard title="Cash Handed Over" value={`FCFA ${cashHandedOver.toLocaleString()}`} />
        <MetricCard title="Treasury Variance" value={`FCFA ${treasuryVariance.toLocaleString()}`} />
        <MetricCard title="Pending Handovers" value={pendingHandovers.length.toString()} />
      </div>

      {message && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {message}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Treasury Cash Handover
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Record how much cash an agent has handed over to treasury.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
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

            <input
              type="number"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(e.target.value)}
              placeholder="Expected amount"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />

            <input
              type="number"
              value={handedOverAmount}
              onChange={(e) => setHandedOverAmount(e.target.value)}
              placeholder="Handed over amount"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            />

            <input
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Received by"
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optional"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none md:col-span-2"
            />
          </div>

          <Button onClick={createHandover} className="mt-6 px-6 py-3">
            Record Handover
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Agent Reconciliation Today
          </h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Agent</th>
                  <th className="py-4">Expected</th>
                  <th className="py-4">Collected</th>
                  <th className="py-4">Collection Variance</th>
                  <th className="py-4">Pending</th>
                  <th className="py-4">Handed Over</th>
                  <th className="py-4">Treasury Variance</th>
                </tr>
              </thead>

              <tbody>
                {agentPerformance.map((item) => (
                  <tr key={item.agent.id} className="border-b">
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {item.agent.full_name}
                      <span className="block text-xs text-slate-500">
                        {item.agent.agent_code}
                      </span>
                    </td>
                    <td className="py-4 font-bold">
                      FCFA {item.expected.toLocaleString()}
                    </td>
                    <td className="py-4 font-bold">
                      FCFA {item.collected.toLocaleString()}
                    </td>
                    <td
                      className={
                        item.variance < 0
                          ? "py-4 font-black text-red-600"
                          : "py-4 font-black text-green-700"
                      }
                    >
                      FCFA {item.variance.toLocaleString()}
                    </td>
                    <td className="py-4">{item.pendingCount}</td>
                    <td className="py-4 font-bold">
                      FCFA {item.handed.toLocaleString()}
                    </td>
                    <td
                      className={
                        item.treasuryVariance < 0
                          ? "py-4 font-black text-red-600"
                          : "py-4 font-black text-green-700"
                      }
                    >
                      FCFA {item.treasuryVariance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Team Reconciliation Today
          </h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-4">Team</th>
                  <th className="py-4">Expected</th>
                  <th className="py-4">Collected</th>
                  <th className="py-4">Variance</th>
                </tr>
              </thead>

              <tbody>
                {teamPerformance.map((item) => (
                  <tr key={item.team.id} className="border-b">
                    <td className="py-4 font-bold text-[#0D2D6E]">
                      {item.team.team_name}
                      <span className="block text-xs text-slate-500">
                        {item.team.team_code || ""}
                      </span>
                    </td>
                    <td className="py-4 font-bold">
                      FCFA {item.expected.toLocaleString()}
                    </td>
                    <td className="py-4 font-bold">
                      FCFA {item.collected.toLocaleString()}
                    </td>
                    <td
                      className={
                        item.variance < 0
                          ? "py-4 font-black text-red-600"
                          : "py-4 font-black text-green-700"
                      }
                    >
                      FCFA {item.variance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Pending Treasury Handovers
          </h2>

          {pendingHandovers.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No pending handovers.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Agent</th>
                    <th className="py-4">Team</th>
                    <th className="py-4">Expected</th>
                    <th className="py-4">Handed Over</th>
                    <th className="py-4">Variance</th>
                    <th className="py-4">Received By</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingHandovers.map((handover) => (
                    <tr key={handover.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {handover.agents?.full_name || "-"}
                      </td>
                      <td className="py-4">
                        {handover.agent_teams?.team_name || "-"}
                      </td>
                      <td className="py-4 font-bold">
                        FCFA{" "}
                        {Number(handover.expected_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 font-bold">
                        FCFA{" "}
                        {Number(
                          handover.handed_over_amount || 0
                        ).toLocaleString()}
                      </td>
                      <td
                        className={
                          Number(handover.variance || 0) < 0
                            ? "py-4 font-black text-red-600"
                            : "py-4 font-black text-green-700"
                        }
                      >
                        FCFA {Number(handover.variance || 0).toLocaleString()}
                      </td>
                      <td className="py-4">{handover.received_by || "-"}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveHandover(handover)}
                            className="px-4 py-2"
                          >
                            Approve
                          </Button>

                          <button
                            onClick={() => rejectHandover(handover)}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
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