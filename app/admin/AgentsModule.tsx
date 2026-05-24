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
  team_lead_id: string | null;
  bike_rider_id: string | null;
  status: string;
  notes: string | null;
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
  daily_target: number | null;
  weekly_target: number | null;
  monthly_target: number | null;
  joined_at: string | null;
  created_at: string;
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
  const [teamLeadId, setTeamLeadId] = useState("");
  const [bikeRiderId, setBikeRiderId] = useState("");
  const [teamNotes, setTeamNotes] = useState("");

  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentRole, setAgentRole] = useState("agent");
  const [agentTeamId, setAgentTeamId] = useState("");
  const [commissionRate, setCommissionRate] = useState("10");
  const [dailyTarget, setDailyTarget] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

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
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAgents(data || []);
  }

  async function loadCommissions() {
    const { data, error } = await supabase
      .from("agent_commissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCommissions(data || []);
  }

  function generateTeamCode() {
    return `TEAM-${Date.now().toString().slice(-6)}`;
  }

  function generateAgentCode() {
    return `CAPD-AG-${Date.now().toString().slice(-5)}`;
  }

  function getAgentName(agentId: string | null) {
    if (!agentId) return "-";
    return agents.find((agent) => agent.id === agentId)?.full_name || "-";
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return "-";
    return teams.find((team) => team.id === teamId)?.team_name || "-";
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

    const selectedLead = agents.find((agent) => agent.id === teamLeadId);
    const selectedBikeRider = agents.find((agent) => agent.id === bikeRiderId);

    const { error } = await supabase.from("agent_teams").insert({
      team_name: teamName.trim(),
      team_code: teamCode.trim() || generateTeamCode(),
      region: region.trim() || null,
      team_lead_id: teamLeadId || null,
      bike_rider_id: bikeRiderId || null,
      team_lead_name: selectedLead?.full_name || null,
      bike_rider_name: selectedBikeRider?.full_name || null,
      notes: teamNotes.trim() || null,
      status: "active",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Sales team created successfully.");
    setTeamName("");
    setTeamCode("");
    setRegion("");
    setTeamLeadId("");
    setBikeRiderId("");
    setTeamNotes("");
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
      daily_target: Number(dailyTarget || 0),
      weekly_target: Number(weeklyTarget || 0),
      monthly_target: Number(monthlyTarget || 0),
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
    setDailyTarget("");
    setWeeklyTarget("");
    setMonthlyTarget("");
    await loadAgents();
  }

  async function updateAgentTeam(agentId: string, teamId: string) {
    const { error } = await supabase
      .from("agents")
      .update({ team_id: teamId || null })
      .eq("id", agentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Agent team updated.");
    await loadAgents();
  }
async function createAgentLogin(agent: Agent) {
  if (!canManageAgents) {
    setMessage("You do not have permission to create agent logins.");
    return;
  }

  if (!agent.email) {
    setMessage("This agent needs an email before login can be created.");
    return;
  }

  const confirmed = window.confirm(
    `Create login account for ${agent.full_name}?`
  );

  if (!confirmed) return;

  const response = await fetch("/api/create-agent-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: agent.id,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    setMessage(result.error || "Could not create agent login.");
    return;
  }

  setMessage(
    `Agent login created. Temporary password: ${result.temporaryPassword}`
  );

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

  async function updateTeamStatus(team: AgentTeam) {
    const nextStatus = team.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("agent_teams")
      .update({ status: nextStatus })
      .eq("id", team.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Team marked as ${nextStatus}.`);
    await loadTeams();
  }

  const teamPerformance = useMemo(() => {
    return teams.map((team) => {
      const teamAgents = agents.filter((agent) => agent.team_id === team.id);
      const teamAgentIds = teamAgents.map((agent) => agent.id);

      const teamCommissions = commissions.filter(
        (commission) =>
          commission.agent_id && teamAgentIds.includes(commission.agent_id)
      );

      const totalCommission = teamCommissions.reduce(
        (sum, commission) => sum + Number(commission.commission_amount || 0),
        0
      );

      const pendingCommission = teamCommissions
        .filter((commission) => commission.status === "pending")
        .reduce(
          (sum, commission) => sum + Number(commission.commission_amount || 0),
          0
        );

      return {
        team,
        totalAgents: teamAgents.length,
        activeAgents: teamAgents.filter((agent) => agent.status === "active")
          .length,
        salesAgents: teamAgents.filter((agent) => agent.role === "agent").length,
        teamLeads: teamAgents.filter((agent) => agent.role === "team_lead")
          .length,
        bikeRiders: teamAgents.filter((agent) => agent.role === "bike_rider")
          .length,
        totalCommission,
        pendingCommission,
      };
    });
  }, [teams, agents, commissions]);

  const totalTeams = teams.length;
  const activeTeams = teams.filter((team) => team.status === "active").length;
  const totalAgents = agents.length;
  const activeAgents = agents.filter((agent) => agent.status === "active").length;
  const totalCommission = commissions.reduce(
    (sum, commission) => sum + Number(commission.commission_amount || 0),
    0
  );
  const pendingCommission = commissions
    .filter((commission) => commission.status === "pending")
    .reduce(
      (sum, commission) => sum + Number(commission.commission_amount || 0),
      0
    );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Teams" value={totalTeams.toString()} />
        <MetricCard title="Active Teams" value={activeTeams.toString()} />
        <MetricCard title="Total Agents" value={totalAgents.toString()} />
        <MetricCard title="Active Agents" value={activeAgents.toString()} />
        <MetricCard
          title="Total Commission"
          value={`FCFA ${totalCommission.toLocaleString()}`}
        />
        <MetricCard
          title="Pending Commission"
          value={`FCFA ${pendingCommission.toLocaleString()}`}
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
            Structure each field team with a team lead, five sales agents, and a bike rider.
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

            <select
              value={teamLeadId}
              onChange={(e) => setTeamLeadId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="">Select Team Lead</option>
              {agents
                .filter((agent) => agent.role === "team_lead")
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.agent_code})
                  </option>
                ))}
            </select>

            <select
              value={bikeRiderId}
              onChange={(e) => setBikeRiderId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            >
              <option value="">Select Bike Rider</option>
              {agents
                .filter((agent) => agent.role === "bike_rider")
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.agent_code})
                  </option>
                ))}
            </select>

            <input
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Notes"
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
            Create Agent / Team Member
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Full name"
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
              <option value="agent">Sales Agent</option>
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

            <input
              value={dailyTarget}
              onChange={(e) => setDailyTarget(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Daily target"
            />

            <input
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Weekly target"
            />

            <input
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              placeholder="Monthly target"
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
            Sales Team Performance
          </h2>

          {teamPerformance.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No sales teams created yet.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {teamPerformance.map((item) => (
                <div
                  key={item.team.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-black text-[#0D2D6E]">
                        {item.team.team_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.team.region || "No region"} ·{" "}
                        {item.team.team_code || "No code"}
                      </p>
                    </div>

                    <span
                      className={
                        item.team.status === "active"
                          ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                      }
                    >
                      {item.team.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-2">
                    <p>Team Lead: {getAgentName(item.team.team_lead_id)}</p>
                    <p>Bike Rider: {getAgentName(item.team.bike_rider_id)}</p>
                    <p>Total Members: {item.totalAgents}</p>
                    <p>Active Agents: {item.activeAgents}</p>
                    <p>Sales Agents: {item.salesAgents}</p>
                    <p>Bike Riders: {item.bikeRiders}</p>
                    <p>
                      Commission: FCFA {item.totalCommission.toLocaleString()}
                    </p>
                    <p>
                      Pending: FCFA {item.pendingCommission.toLocaleString()}
                    </p>
                  </div>

                  <Button
                    onClick={() => updateTeamStatus(item.team)}
                    className="mt-5 px-4 py-2"
                  >
                    {item.team.status === "active"
                      ? "Deactivate Team"
                      : "Activate Team"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Agents and Team Assignment
          </h2>

          {loading ? (
            <p className="mt-6 font-semibold text-slate-600">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No agents created yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-4">Name</th>
                    <th className="py-4">Code</th>
                    <th className="py-4">Role</th>
                    <th className="py-4">Team</th>
                    <th className="py-4">Phone</th>
                    <th className="py-4">Rate</th>
                    <th className="py-4">Daily Target</th>
                    <th className="py-4">Weekly Target</th>
                    <th className="py-4">Monthly Target</th>
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
                        <select
                          value={agent.team_id || ""}
                          onChange={(e) =>
                            updateAgentTeam(agent.id, e.target.value)
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <option value="">No Team</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.team_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-4">{agent.phone || "-"}</td>

                      <td className="py-4">
                        {Number(agent.commission_rate || 0)}%
                      </td>

                      <td className="py-4">
                        {Number(agent.daily_target || 0).toLocaleString()}
                      </td>

                      <td className="py-4">
                        {Number(agent.weekly_target || 0).toLocaleString()}
                      </td>

                      <td className="py-4">
                        {Number(agent.monthly_target || 0).toLocaleString()}
                      </td>

                      <td className="py-4">{agent.status}</td>

                     <td className="py-4">
  <div className="flex flex-wrap gap-2">
    <Button
      onClick={() => updateAgentStatus(agent)}
      className="px-4 py-2"
    >
      {agent.status === "active" ? "Deactivate" : "Activate"}
    </Button>

    <Button
      onClick={() => createAgentLogin(agent)}
      className="px-4 py-2 bg-[#009B5A] hover:opacity-90"
    >
      Create Login
    </Button>
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