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
  member_id: string | null;
  agent_id: string | null;
  team_id: string | null;
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
  approved_at: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [collectionDate, setCollectionDate] = useState(
  new Date().toISOString().slice(0, 10)
);
const [typeFilter, setTypeFilter] = useState("all");
const [dateFilter, setDateFilter] = useState(
  new Date().toISOString().slice(0, 10)
);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadMembers(),
      loadAgents(),
      loadTeams(),
      loadCollections(),
    ]);
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
      status: "pending",
      notes: notes.trim() || null,
      collection_date: collectionDate,
    });

    if (error) {
      setMessage(error.message);
      return;
    }
setCollectionDate(new Date().toISOString().slice(0, 10));

    setMessage("Collection recorded and sent for approval.");
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

  async function approveCollection(collection: Collection) {
    if (collection.status === "approved") {
      setMessage("This collection has already been approved.");
      return;
    }

    if (collection.status === "rejected") {
      setMessage("Rejected collections cannot be approved.");
      return;
    }

    const confirmed = window.confirm("Approve this collection?");
    if (!confirmed) return;

    if (collection.collection_type === "savings") {
      const memberName = collection.members?.full_name || "Savings Client";
      const agentName = collection.agents?.full_name || "Admin";
      const amount = Number(collection.collected_amount || 0);

      const { data: existingAccount, error: accountLoadError } = await supabase
        .from("savings_accounts")
        .select("id, total_saved")
        .eq("member_id", collection.member_id)
        .maybeSingle();

      if (accountLoadError) {
        setMessage(accountLoadError.message);
        return;
      }

      let savingsAccountId = existingAccount?.id || null;

      if (!savingsAccountId) {
        const { data: newAccount, error: createAccountError } = await supabase
          .from("savings_accounts")
          .insert({
            member_id: collection.member_id,
            client_name: memberName,
            account_number: `SAV-${Date.now()}`,
            agent_name: agentName,
            start_date: new Date().toISOString(),
            monthly_fee_percent: 2,
            total_saved: amount,
            total_withdrawn: 0,
            status: "active",
            notes: "Created automatically from approved collection.",
          })
          .select("id")
          .single();

        if (createAccountError) {
          setMessage(createAccountError.message);
          return;
        }

        savingsAccountId = newAccount.id;
      } else {
        const updatedTotal = Number(existingAccount?.total_saved || 0) + amount;

        const { error: updateSavingsError } = await supabase
          .from("savings_accounts")
          .update({
            total_saved: updatedTotal,
          })
          .eq("id", savingsAccountId);

        if (updateSavingsError) {
          setMessage(updateSavingsError.message);
          return;
        }
      }

      const { error: transactionError } = await supabase
        .from("savings_transactions")
        .insert({
          savings_account_id: savingsAccountId,
          amount,
          payment_method: collection.payment_method || "cash",
          reference: collection.reference || null,
          transaction_type: "deposit",
          collected_by: agentName,
        });

      if (transactionError) {
        setMessage(transactionError.message);
        return;
      }
    }
if (collection.collection_type === "share") {
  const amount = Number(collection.collected_amount || 0);
  const SHARE_PRICE = 10000;
  const sharesBought = Math.floor(amount / SHARE_PRICE);

  if (sharesBought > 0 && collection.member_id) {
    const { data: memberRecord, error: memberLoadError } = await supabase
      .from("members")
      .select("id, total_shares, portfolio_value")
      .eq("id", collection.member_id)
      .single();

    if (memberLoadError) {
      setMessage(memberLoadError.message);
      return;
    }

    const updatedShares =
      Number(memberRecord.total_shares || 0) + sharesBought;

    const updatedPortfolio =
      Number(memberRecord.portfolio_value || 0) + amount;

    const { error: memberUpdateError } = await supabase
      .from("members")
      .update({
        total_shares: updatedShares,
        portfolio_value: updatedPortfolio,
      })
      .eq("id", collection.member_id);

    if (memberUpdateError) {
      setMessage(memberUpdateError.message);
      return;
    }
  }
}

if (collection.collection_type === "loan") {
  const amount = Number(collection.collected_amount || 0);

  if (amount <= 0) {
    setMessage("Loan repayment amount must be greater than zero.");
    return;
  }

  if (!collection.member_id) {
    setMessage("This loan collection is not linked to a member.");
    return;
  }

  const { data: activeLoan, error: loanLoadError } = await supabase
    .from("loans")
    .select(
      "id, member_id, amount_repaid, outstanding_balance, total_expected_repayment, status"
    )
    .eq("member_id", collection.member_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loanLoadError) {
    setMessage(loanLoadError.message);
    return;
  }

  if (!activeLoan) {
    setMessage("No active loan found for this member.");
    return;
  }

  const currentRepaid = Number(activeLoan.amount_repaid || 0);
  const currentBalance =
    Number(activeLoan.outstanding_balance || 0) > 0
      ? Number(activeLoan.outstanding_balance || 0)
      : Number(activeLoan.total_expected_repayment || 0) - currentRepaid;

  const updatedRepaid = currentRepaid + amount;
  const updatedBalance = Math.max(currentBalance - amount, 0);
  const nextStatus = updatedBalance <= 0 ? "closed" : "active";

  const { error: loanUpdateError } = await supabase
    .from("loans")
    .update({
      amount_repaid: updatedRepaid,
      outstanding_balance: updatedBalance,
      last_payment_date: new Date().toISOString(),
      status: nextStatus,
    })
    .eq("id", activeLoan.id);

  if (loanUpdateError) {
    setMessage(loanUpdateError.message);
    return;
  }

  let remainingPayment = amount;

  const { data: scheduleRows, error: scheduleLoadError } = await supabase
    .from("loan_repayment_schedule")
    .select("id, expected_amount, paid_amount, arrears_amount, status, due_date")
    .eq("loan_id", activeLoan.id)
    .in("status", ["pending", "partial", "overdue"])
    .order("due_date", { ascending: true });

  if (scheduleLoadError) {
    setMessage(scheduleLoadError.message);
    return;
  }

  for (const row of scheduleRows || []) {
    if (remainingPayment <= 0) break;

    const expected = Number(row.expected_amount || 0);
    const alreadyPaid = Number(row.paid_amount || 0);
    const outstandingForRow = Math.max(expected - alreadyPaid, 0);

    if (outstandingForRow <= 0) continue;

    const amountApplied = Math.min(remainingPayment, outstandingForRow);
    const newPaidAmount = alreadyPaid + amountApplied;
    const newArrearsAmount = Math.max(expected - newPaidAmount, 0);

    let newStatus = "partial";

    if (newArrearsAmount <= 0) {
      newStatus = "paid";
    } else if (new Date(row.due_date) < new Date()) {
      newStatus = "overdue";
    }

    const { error: scheduleUpdateError } = await supabase
      .from("loan_repayment_schedule")
      .update({
        paid_amount: newPaidAmount,
        arrears_amount: newArrearsAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (scheduleUpdateError) {
      setMessage(scheduleUpdateError.message);
      return;
    }

    remainingPayment -= amountApplied;
  }
}

    const { error: approveError } = await supabase
      .from("collections")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", collection.id);

    if (approveError) {
      setMessage(approveError.message);
      return;
    }

    setMessage("Collection approved successfully.");
    await loadCollections();
  }

  async function rejectCollection(collection: Collection) {
    if (collection.status === "approved") {
      setMessage("Approved collections cannot be rejected.");
      return;
    }

    const confirmed = window.confirm("Reject this collection?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("collections")
      .update({
        status: "rejected",
      })
      .eq("id", collection.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Collection rejected.");
    await loadCollections();
  }

  const today = new Date().toISOString().slice(0, 10);

  const todayCollections = useMemo(() => {
    return collections.filter((item) => item.collection_date === today);
  }, [collections, today]);

  const approvedTodayCollections = todayCollections.filter(
    (item) => item.status === "approved"
  );

  const pendingCollections = collections.filter(
    (item) => item.status === "pending"
  );
const filteredCollections = useMemo(() => {
  return collections.filter((item) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      !search ||
      item.members?.full_name?.toLowerCase().includes(search) ||
      item.members?.member_number?.toLowerCase().includes(search) ||
      item.agents?.full_name?.toLowerCase().includes(search) ||
      item.agents?.agent_code?.toLowerCase().includes(search) ||
      item.reference?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    const matchesType =
      typeFilter === "all" || item.collection_type === typeFilter;

    const matchesDate =
      !dateFilter || item.collection_date === dateFilter;

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });
}, [collections, searchTerm, statusFilter, typeFilter, dateFilter]);

const filteredPendingCollections = filteredCollections.filter(
  (item) => item.status === "pending"
);

const filteredApprovedCollections = filteredCollections.filter(
  (item) => item.status === "approved"
);

function resetCollectionFilters() {
  setSearchTerm("");
  setStatusFilter("all");
  setTypeFilter("all");
  setDateFilter(new Date().toISOString().slice(0, 10));
}
  const todayExpected = approvedTodayCollections.reduce(
    (sum, item) => sum + Number(item.expected_amount || 0),
    0
  );

  const todayCollected = approvedTodayCollections.reduce(
    (sum, item) => sum + Number(item.collected_amount || 0),
    0
  );

  const todayVariance = todayCollected - todayExpected;

  const savingsTotal = approvedTodayCollections
    .filter((item) => item.collection_type === "savings")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const loanTotal = approvedTodayCollections
    .filter((item) => item.collection_type === "loan")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const shareTotal = approvedTodayCollections
    .filter((item) => item.collection_type === "share")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Approved Expected"
          value={`FCFA ${todayExpected.toLocaleString()}`}
        />
        <MetricCard
          title="Approved Collected"
          value={`FCFA ${todayCollected.toLocaleString()}`}
        />
        <MetricCard
          title="Approved Variance"
          value={`FCFA ${todayVariance.toLocaleString()}`}
        />
        <MetricCard
          title="Pending Review"
          value={pendingCollections.length.toString()}
        />
        <MetricCard
          title="Savings Approved"
          value={`FCFA ${savingsTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Loan Approved"
          value={`FCFA ${loanTotal.toLocaleString()}`}
        />
        <MetricCard
          title="Share Approved"
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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-[#0D2D6E]">
          Collections Search & Filters
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Search and filter collections by member, agent, type, status, and date.
        </p>
      </div>

      <Button onClick={resetCollectionFilters} className="px-5 py-3">
        Reset Filters
      </Button>
    </div>

    <div className="mt-6 grid gap-5 md:grid-cols-4">
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search member, agent, code, reference"
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none md:col-span-2"
      />

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
      >
        <option value="all">All Types</option>
        <option value="savings">Savings</option>
        <option value="loan">Loan Repayment</option>
        <option value="share">Share Subscription</option>
      </select>

      <input
        type="date"
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
      />
    </div>
  </CardContent>
</Card>
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
            <input
  type="date"
  value={collectionDate}
  onChange={(e) => setCollectionDate(e.target.value)}
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
            Pending Collections
          </h2>

          {filteredPendingCollections.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No pending collections.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
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
                    <th className="py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPendingCollections.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {item.members?.full_name || "-"}
                      </td>
                      <td className="py-4">{item.agents?.full_name || "-"}</td>
                      <td className="py-4">
                        {item.agent_teams?.team_name || "-"}
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
                      <td className="py-4">{item.payment_method || "-"}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveCollection(item)}
                            className="px-4 py-2"
                          >
                            Approve
                          </Button>

                          <button
                            onClick={() => rejectCollection(item)}
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

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-2xl font-black text-[#0D2D6E]">
            Today's Approved Collections
          </h2>

          {filteredApprovedCollections.length === 0 ? (
            <p className="mt-6 font-semibold text-slate-600">
              No approved collections today.
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
                  {approvedTodayCollections.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-4 font-bold text-[#0D2D6E]">
                        {item.members?.full_name || "-"}
                      </td>
                      <td className="py-4">{item.agents?.full_name || "-"}</td>
                      <td className="py-4">
                        {item.agent_teams?.team_name || "-"}
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