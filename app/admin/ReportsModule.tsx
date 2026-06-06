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
  payment_method: string;
  status: string;
  collection_date: string;
  created_at: string;
  agents?: Agent | null;
  agent_teams?: Team | null;
};

type Commission = {
  id: string;
  agent_id: string;
  commission_amount: number;
  status: string;
  created_at: string;
};

type CashHandover = {
  id: string;
  agent_id: string | null;
  team_id: string | null;
  expected_amount: number;
  handed_over_amount: number;
  variance: number;
  status: string;
  handover_date: string;
};

export default function ReportsModule() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState("");

  const [period, setPeriod] = useState("today");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    await Promise.all([
      loadCollections(),
      loadCommissions(),
      loadHandovers(),
      loadAgents(),
      loadTeams(),
    ]);
  }

  async function loadCollections() {
    const { data, error } = await supabase
      .from("collections")
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
      return;
    }

    setCollections((data as unknown as Collection[]) || []);
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

    setCommissions((data as unknown as Commission[]) || []);
  }

  async function loadHandovers() {
    const { data, error } = await supabase
      .from("cash_handovers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setHandovers((data as unknown as CashHandover[]) || []);
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

    setAgents((data as Agent[]) || []);
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

    setTeams((data as Team[]) || []);
  }

  function getDateRange() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (period === "today") {
      return { start: today, end: today };
    }

    if (period === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return {
        start: start.toISOString().slice(0, 10),
        end: today,
      };
    }

    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: start.toISOString().slice(0, 10),
        end: today,
      };
    }

    return { start: "1900-01-01", end: today };
  }

  const range = getDateRange();

  const filteredCollections = useMemo(() => {
    return collections.filter(
      (item) =>
        item.collection_date >= range.start &&
        item.collection_date <= range.end &&
        item.status === "approved"
    );
  }, [collections, range.start, range.end]);

  const pendingCollections = useMemo(() => {
    return collections.filter(
      (item) =>
        item.collection_date >= range.start &&
        item.collection_date <= range.end &&
        item.status === "pending"
    );
  }, [collections, range.start, range.end]);

  const filteredHandovers = useMemo(() => {
    return handovers.filter(
      (item) =>
        item.handover_date >= range.start &&
        item.handover_date <= range.end &&
        item.status === "approved"
    );
  }, [handovers, range.start, range.end]);

  const totalCollected = filteredCollections.reduce(
    (sum, item) => sum + Number(item.collected_amount || 0),
    0
  );

  const totalExpected = filteredCollections.reduce(
    (sum, item) => sum + Number(item.expected_amount || 0),
    0
  );

  const totalVariance = totalCollected - totalExpected;

  const treasuryTotal = filteredHandovers.reduce(
    (sum, item) => sum + Number(item.handed_over_amount || 0),
    0
  );

  const treasuryVariance = treasuryTotal - totalCollected;

  const totalSavings = filteredCollections
    .filter((item) => item.collection_type === "savings")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const totalLoans = filteredCollections
    .filter((item) => item.collection_type === "loan")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const totalShares = filteredCollections
    .filter((item) => item.collection_type === "share")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const pendingCommissions = commissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  const paidCommissions = commissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  const agentReport = useMemo(() => {
    return agents.map((agent) => {
      const agentCollections = filteredCollections.filter(
        (item) => item.agent_id === agent.id
      );

      const agentPending = pendingCollections.filter(
        (item) => item.agent_id === agent.id
      );

      const agentHandovers = filteredHandovers.filter(
        (item) => item.agent_id === agent.id
      );

      const agentCommissions = commissions.filter(
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

      const handedOver = agentHandovers.reduce(
        (sum, item) => sum + Number(item.handed_over_amount || 0),
        0
      );

      const commissionGenerated = agentCommissions.reduce(
        (sum, item) => sum + Number(item.commission_amount || 0),
        0
      );

      const commissionPaid = agentCommissions
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

      const team = teams.find((team) => team.id === agent.team_id);

      return {
        agentName: agent.full_name,
        agentCode: agent.agent_code,
        teamName: team?.team_name || "-",
        expected,
        collected,
        collectionVariance: collected - expected,
        pendingCollections: agentPending.length,
        handedOver,
        treasuryVariance: handedOver - collected,
        commissionGenerated,
        commissionPaid,
      };
    });
  }, [
    agents,
    teams,
    filteredCollections,
    pendingCollections,
    filteredHandovers,
    commissions,
  ]);

  const teamReport = useMemo(() => {
    return teams.map((team) => {
      const teamCollections = filteredCollections.filter(
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
        teamName: team.team_name,
        teamCode: team.team_code || "-",
        expected,
        collected,
        variance: collected - expected,
      };
    });
  }, [teams, filteredCollections]);

  const collectionsDetailReport = filteredCollections.map((item) => ({
  Date: item.collection_date,
  Agent: item.agents?.full_name || "-",
  Team: item.agent_teams?.team_name || "-",
  Type: item.collection_type,
  Expected: Number(item.expected_amount || 0),
  Collected: Number(item.collected_amount || 0),
  Variance: Number(item.variance || 0),
  Method: item.payment_method || "-",
  Status: item.status,
}));

const treasuryReport = filteredHandovers.map((item) => {
  const agent = agents.find((agent) => agent.id === item.agent_id);
  const team = teams.find((team) => team.id === item.team_id);

  return {
    Date: item.handover_date,
    Agent: agent?.full_name || "-",
    Team: team?.team_name || "-",
    Expected: Number(item.expected_amount || 0),
    HandedOver: Number(item.handed_over_amount || 0),
    Variance: Number(item.variance || 0),
    Status: item.status,
  };
});

const commissionReport = agents.map((agent) => {
  const agentCommissions = commissions.filter(
    (item) => item.agent_id === agent.id
  );

  const generated = agentCommissions.reduce(
    (sum, item) => sum + Number(item.commission_amount || 0),
    0
  );

  const pending = agentCommissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  const paid = agentCommissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  return {
    Agent: agent.full_name,
    Code: agent.agent_code,
    Generated: generated,
    Pending: pending,
    Paid: paid,
  };
});

  function exportCSV(filename: string, rows: Record<string, string | number>[]) {
    if (rows.length === 0) {
      setMessage("No records to export.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", filename);
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0D2D6E]">
            Reports & Intelligence Centre
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Management reports for collections, agents, treasury, and commissions.
          </p>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>

      </div>

      {message && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Collected" value={`FCFA ${totalCollected.toLocaleString()}`} />
        <MetricCard title="Expected" value={`FCFA ${totalExpected.toLocaleString()}`} />
        <MetricCard title="Collection Variance" value={`FCFA ${totalVariance.toLocaleString()}`} />
        <MetricCard title="Treasury Variance" value={`FCFA ${treasuryVariance.toLocaleString()}`} />
        <MetricCard title="Savings" value={`FCFA ${totalSavings.toLocaleString()}`} />
        <MetricCard title="Aid Repayments" value={`FCFA ${totalLoans.toLocaleString()}`} />
        <MetricCard title="Shares" value={`FCFA ${totalShares.toLocaleString()}`} />
        <MetricCard title="Pending Collections" value={pendingCollections.length.toString()} />
        <MetricCard title="Pending Commission" value={`FCFA ${pendingCommissions.toLocaleString()}`} />
        <MetricCard title="Paid Commission" value={`FCFA ${paidCommissions.toLocaleString()}`} />
        <MetricCard title="Active Agents" value={agents.length.toString()} />
      </div>

      <ReportCard
        title="Agent Performance Report"
        description="Collections, handovers, variances, and commissions by agent."
        onExport={() =>
          exportCSV("agent-performance-report.csv", agentReport)
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
                <th className="py-4">Agent</th>
                <th className="py-4">Team</th>
                <th className="py-4">Expected</th>
                <th className="py-4">Collected</th>
                <th className="py-4">Variance</th>
                <th className="py-4">Pending</th>
                <th className="py-4">Handed Over</th>
                <th className="py-4">Treasury Variance</th>
                <th className="py-4">Commission Generated</th>
                <th className="py-4">Commission Paid</th>
              </tr>
            </thead>

            <tbody>
              {agentReport.map((row) => (
                <tr key={row.agentCode} className="border-b">
                  <td className="py-4 font-bold text-[#0D2D6E]">
                    {row.agentName}
                    <span className="block text-xs text-slate-500">
                      {row.agentCode}
                    </span>
                  </td>
                  <td className="py-4">{row.teamName}</td>
                  <td className="py-4 font-bold">FCFA {row.expected.toLocaleString()}</td>
                  <td className="py-4 font-bold">FCFA {row.collected.toLocaleString()}</td>
                  <td className={row.collectionVariance < 0 ? "py-4 font-black text-red-600" : "py-4 font-black text-green-700"}>
                    FCFA {row.collectionVariance.toLocaleString()}
                  </td>
                  <td className="py-4">{row.pendingCollections}</td>
                  <td className="py-4 font-bold">FCFA {row.handedOver.toLocaleString()}</td>
                  <td className={row.treasuryVariance < 0 ? "py-4 font-black text-red-600" : "py-4 font-black text-green-700"}>
                    FCFA {row.treasuryVariance.toLocaleString()}
                  </td>
                  <td className="py-4 font-bold">FCFA {row.commissionGenerated.toLocaleString()}</td>
                  <td className="py-4 font-bold">FCFA {row.commissionPaid.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>

      <ReportCard
        title="Team Performance Report"
        description="Collection performance by sales team."
        onExport={() => exportCSV("team-performance-report.csv", teamReport)}
      >
        <div className="overflow-x-auto">
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
              {teamReport.map((row) => (
                <tr key={row.teamCode} className="border-b">
                  <td className="py-4 font-bold text-[#0D2D6E]">
                    {row.teamName}
                    <span className="block text-xs text-slate-500">
                      {row.teamCode}
                    </span>
                  </td>
                  <td className="py-4 font-bold">FCFA {row.expected.toLocaleString()}</td>
                  <td className="py-4 font-bold">FCFA {row.collected.toLocaleString()}</td>
                  <td className={row.variance < 0 ? "py-4 font-black text-red-600" : "py-4 font-black text-green-700"}>
                    FCFA {row.variance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>
      <ReportCard
  title="Collections Detail Report"
  description="Approved collections by agent, team, product type, method, and variance."
  onExport={() =>
    exportCSV("collections-detail-report.csv", collectionsDetailReport)
  }
>
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
          <th className="py-4">Date</th>
          <th className="py-4">Agent</th>
          <th className="py-4">Team</th>
          <th className="py-4">Type</th>
          <th className="py-4">Expected</th>
          <th className="py-4">Collected</th>
          <th className="py-4">Variance</th>
          <th className="py-4">Method</th>
        </tr>
      </thead>

      <tbody>
        {collectionsDetailReport.map((row, index) => (
          <tr key={index} className="border-b">
            <td className="py-4">{row.Date}</td>
            <td className="py-4 font-bold text-[#0D2D6E]">{row.Agent}</td>
            <td className="py-4">{row.Team}</td>
            <td className="py-4 capitalize">{row.Type}</td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Expected).toLocaleString()}
            </td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Collected).toLocaleString()}
            </td>
            <td
              className={
                Number(row.Variance) < 0
                  ? "py-4 font-black text-red-600"
                  : "py-4 font-black text-green-700"
              }
            >
              FCFA {Number(row.Variance).toLocaleString()}
            </td>
            <td className="py-4">{row.Method}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</ReportCard>

<ReportCard
  title="Treasury Handover Report"
  description="Cash handover reconciliation by agent and team."
  onExport={() => exportCSV("treasury-handover-report.csv", treasuryReport)}
>
  <div className="overflow-x-auto">
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
          <th className="py-4">Date</th>
          <th className="py-4">Agent</th>
          <th className="py-4">Team</th>
          <th className="py-4">Expected</th>
          <th className="py-4">Handed Over</th>
          <th className="py-4">Variance</th>
          <th className="py-4">Status</th>
        </tr>
      </thead>

      <tbody>
        {treasuryReport.map((row, index) => (
          <tr key={index} className="border-b">
            <td className="py-4">{row.Date}</td>
            <td className="py-4 font-bold text-[#0D2D6E]">{row.Agent}</td>
            <td className="py-4">{row.Team}</td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Expected).toLocaleString()}
            </td>
            <td className="py-4 font-bold">
              FCFA {Number(row.HandedOver).toLocaleString()}
            </td>
            <td
              className={
                Number(row.Variance) < 0
                  ? "py-4 font-black text-red-600"
                  : "py-4 font-black text-green-700"
              }
            >
              FCFA {Number(row.Variance).toLocaleString()}
            </td>
            <td className="py-4 capitalize">{row.Status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</ReportCard>

<ReportCard
  title="Commission Report"
  description="Generated, pending, and paid agent commissions."
  onExport={() => exportCSV("commission-report.csv", commissionReport)}
>
  <div className="overflow-x-auto">
    <table className="w-full min-w-[800px] text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
          <th className="py-4">Agent</th>
          <th className="py-4">Code</th>
          <th className="py-4">Generated</th>
          <th className="py-4">Pending</th>
          <th className="py-4">Paid</th>
        </tr>
      </thead>

      <tbody>
        {commissionReport.map((row) => (
          <tr key={row.Code} className="border-b">
            <td className="py-4 font-bold text-[#0D2D6E]">{row.Agent}</td>
            <td className="py-4">{row.Code}</td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Generated).toLocaleString()}
            </td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Pending).toLocaleString()}
            </td>
            <td className="py-4 font-bold">
              FCFA {Number(row.Paid).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</ReportCard>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-3 text-2xl font-black text-[#0D2D6E]">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportCard({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description: string;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#0D2D6E]">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>

          <Button onClick={onExport} className="px-5 py-3">
            Export CSV
          </Button>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}