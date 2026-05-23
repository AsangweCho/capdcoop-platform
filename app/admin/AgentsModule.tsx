"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AgentTeam = {
  id: string;
  team_name: string;
  team_code: string | null;
  region: string | null;
  team_lead_name: string | null;
  bike_rider_name: string | null;
  status: string;
  created_at: string;
};

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
  joined_at: string | null;
  created_at: string;
  agent_teams?: AgentTeam | null;
};

type Commission = {
  id: string;
  agent_id: string | null;
  member_id: string | null;
  payment_id: string | null;
  commission_type: string;
  base_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  agents?: {
    full_name: string;
    agent_code: string;
  } | null;
};

export default function AgentsModule({ currentAdmin }: { currentAdmin: any }) {
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [region, setRegion] = useState("");
  const [teamLeadName, setTeamLeadName] = useState("");
  const [bikeRiderName, setBikeRiderName] = useState("");

  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentRole, setAgentRole] = useState("agent");
  const [agentTeamId, setAgentTeamId] = useState("");
  const [commissionRate, setCommissionRate] = useState("10");

  const canManageAgents =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "membership_officer";

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadTeams(), loadAgents(), loadCommissions()]);
    setLoading(false);
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from("agent_teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTeams(data || []);
  }

  async function loadAgents() {
    const { data, error } = await supabase
      .from("agents")
      .select(`
        *,
        agent_teams (
          id,
          team_name,
          team_code,
          region,
          team_lead_name,
          bike_rider_name,
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAgents((data as unknown as Agent[]) || []);
  }

  async function loadCommissions() {
    const { data, error } = await supabase
      .from("agent_commissions")
      .select(`
        *,
        agents (
          full_name,
          agent_code
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCommissions((data as unknown as Commission[]) || []);
  }

  function generateTeamCode() {
    return `TEAM-${Date.now().toString().slice(-6)}`;
  }

  function generateAgentCode() {
    return `CAPD-AG-${Date.now().toString().slice(-5)}`;
  }

  async function createTeam() {
    if (!canManageAgents) {
      setMessage("You do not have permission to create teams.");
      return;
    }

    if (!teamName.trim()) {
      setMessage("Team name is required.");
      return;
    }

    const { error } = await supabase.from("agent_teams").insert({
      team_name: teamName.trim(),
      team_code: teamCode.trim() || generateTeamCode(),
      region: region.trim() || null,
      team_lead_name: teamLeadName.trim() || null,
      bike_rider_name: bikeRiderName.trim() || null,
      status: "active",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Team created successfully.");
    setTeamName("");
    setTeamCode("");
    setRegion("");
    setTeamLeadName("");
    setBikeRiderName("");
    await loadTeams();
  }

  async function createAgent() {
    if (!canManageAgents) {
      setMessage("You do not have permission to create agents.");
      return;
    }

    if (!agentName.trim()) {
      setMessage("Agent name is required.");
      return;
    }

    const rate = Number(commissionRate || 10);

    if (Number.isNaN(rate) || rate < 0) {
      setMessage("Commission rate must be a valid positive number.");
      return;
    }

    const { error } = await supabase.from("agents").insert({
      full_name: agentName.trim(),
      agent_code: agentCode.trim() || generateAgentCode(),
      phone: agentPhone.trim() || null,
      email: agentEmail.trim().toLowerCase() || null,
      role: agentRole,
      team_id: agentTeamId || null,
      commission_rate: rate,
      status: "active",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Agent created successfully.");
    setAgentName("");
    setAgentCode("");
    setAgentPhone("");
    setAgentEmail("");
    setAgentRole("agent");
    setAgentTeamId("");
    setCommissionRate("10");
    await loadAgents();
  }

  async function updateAgentStatus(agent: Agent) {
    const nextStatus = agent.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("agents")
      .update({ status: nextStatus })
      .eq("id", agent.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Agent marked as ${nextStatus}.`);
    await loadAgents();
  }

  async function markCommissionPaid(commission: Commission) {
    const { error } = await supabase
      .from("agent_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", commission.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Commission marked as paid.");
    await loadCommissions();
  }

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const pendingCommission = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
  const paidCommission = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const teamPerformance = useMemo(() => {
    return teams.map((team) => {
      const teamAgents = agents.filter((a) => a.team_id === team.id);
      return {
        team,
        agents: teamAgents.length,
        active: teamAgents.filter((a) => a.status === "active").length,
      };
    });
  }, [teams, agents]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Agents" value={totalAgents.toString()} />
        <MetricCard title="Active Agents" value={activeAgents.toString()} />
        <MetricCard
          title="Pending Commission"
          value={`FCFA ${pendingCommission.toLocaleString()}`}
        />
        <MetricCard
          title="Paid Commission"
          value={`FCFA ${paidCommission.toLocaleString()}`}
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
            Create Sales Team
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Each team should have five sales agents, one team lead, and one bike
            rider.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Team name"
            />

            <input
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Team code optional"
            />

            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Region / Area"
            />

            <input
              value={teamLeadName}
              onChange={(e) => setTeamLeadName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Team lead name"
            />

            <input
              value={bikeRiderName}
              onChange={(e) => setBikeRiderName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Bike rider name"
            />
          </div>

          <Button
            onClick={createTeam}
            disabled={!canManageAgents}
            className="mt-6 px-6 py-3"
          >
            Create Team
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Create Agent
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Agent full name"
            />

            <input
              value={agentCode}
              onChange={(e) => setAgentCode(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Agent code optional"
            />

            <input
              value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Phone"
            />

            <input
              value={agentEmail}
              onChange={(e) => setAgentEmail(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Email"
            />

            <select
              value={agentRole}
              onChange={(e) => setAgentRole(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="agent">Agent</option>
              <option value="team_lead">Team Lead</option>
              <option value="bike_rider">Bike Rider</option>
            </select>

            <select
              value={agentTeamId}
              onChange={(e) => setAgentTeamId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="">Assign to Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name} ({team.team_code || "No Code"})
                </option>
              ))}
            </select>

            <input
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Commission rate %"
            />
          </div>

          <Button
            onClick={createAgent}
            disabled={!canManageAgents}
            className="mt-6 px-6 py-3"
          >
            Create Agent
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Team Overview
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {teamPerformance.map(({ team, agents, active }) => (
              <div
                key={team.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xl font-black text-[#0D2D6E]">
                  {team.team_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {team.region || "No region"} · {team.team_code || "No code"}
                </p>
                <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-2">
                  <p>Team Lead: {team.team_lead_name || "-"}</p>
                  <p>Bike Rider: {team.bike_rider_name || "-"}</p>
                  <p>Agents: {agents}</p>
                  <p>Active: {active}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Agents
          </h2>

          {loading ? (
            <p className="mt-6 font-semibold text-slate-600">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No agents created yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Agent</th>
                    <th className="py-4">Code</th>
                    <th className="py-4">Role</th>
                    <th className="py-4">Team</th>
                    <th className="py-4">Phone</th>
                    <th className="py-4">Rate</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {agent.full_name}
                      </td>
                      <td className="py-4">{agent.agent_code}</td>
                      <td className="py-4">{agent.role}</td>
                      <td className="py-4">
                        {agent.agent_teams?.team_name || "-"}
                      </td>
                      <td className="py-4">{agent.phone || "-"}</td>
                      <td className="py-4">
                        {Number(agent.commission_rate || 0)}%
                      </td>
                      <td className="py-4">{agent.status}</td>
                      <td className="py-4">
                        <Button
                          onClick={() => updateAgentStatus(agent)}
                          className="px-4 py-2"
                        >
                          {agent.status === "active"
                            ? "Deactivate"
                            : "Activate"}
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

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Commissions
          </h2>

          {commissions.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No commissions recorded yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Agent</th>
                    <th className="py-4">Type</th>
                    <th className="py-4">Base</th>
                    <th className="py-4">Rate</th>
                    <th className="py-4">Commission</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Created</th>
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {commission.agents?.full_name || "-"}{" "}
                        {commission.agents?.agent_code
                          ? `(${commission.agents.agent_code})`
                          : ""}
                      </td>
                      <td className="py-4">{commission.commission_type}</td>
                      <td className="py-4">
                        FCFA {Number(commission.base_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {Number(commission.commission_rate || 0)}%
                      </td>
                      <td className="py-4 font-bold">
                        FCFA{" "}
                        {Number(
                          commission.commission_amount || 0
                        ).toLocaleString()}
                      </td>
                      <td className="py-4">{commission.status}</td>
                      <td className="py-4">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        {commission.status === "pending" ? (
                          <Button
                            onClick={() => markCommissionPaid(commission)}
                            className="px-4 py-2"
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Paid
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