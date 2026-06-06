"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COLLECTIONS_TABLE = "collections";
const SHARE_PRICE = 10000;

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
type CurrentAdmin = {
  id: string | null;
  role: string | null;
  full_name?: string | null;
  email?: string | null;
};

type LoanUpdatePayload = {
  member_id?: string | null;
  business_name: string | null;
  loan_amount: number;
  duration_days: number;
  insurance_fee: number;
  registration_fee: number;
  total_interest: number;
  daily_payment_amount: number;
  total_expected_repayment: number;
  outstanding_balance: number;
  purpose: string | null;
  status: string;
  edit_reason: string;
  updated_at: string;
  updated_by: string | null;
  approved_at?: string;
  approved_by?: string | null;
  rejected_at?: string;
  rejection_reason?: string;
};

type Collection = {
  id: string;
  member_id: string | null;
  agent_id: string | null;
  team_id: string | null;
  collection_type: string;
  expected_amount: number | null;
  collected_amount: number | null;
  variance: number | null;
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

type ExpectedAidCollection = {
  schedule_id: string;
  aid_facility_id: string;
  member_id: string | null;
  member_name: string | null;
  member_number: string | null;
  business_name: string | null;
  installment_number: number;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  arrears_amount: number;
  amount_due: number;
  repayment_status: string;
  aid_status: string;
  aid_number: string | null;
  outstanding_balance: number | null;
  daily_repayment_amount: number | null;
};

type AidPortfolioSummary = {
  active_aid_count: number;
  pending_aid_count: number;
  closed_aid_count: number;
  total_aid_amount: number;
  total_expected_repayment: number;
  total_amount_repaid: number;
  active_outstanding_balance: number;
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatMoney(value: number | string | null | undefined) {
  return `FCFA ${Number(value || 0).toLocaleString()}`;
}

function getVariance(item: Collection) {
  const expected = Number(item.expected_amount || 0);
  const collected = Number(item.collected_amount || 0);

  if (item.variance !== null && item.variance !== undefined) {
    return Number(item.variance || 0);
  }

  return collected - expected;
}

function getCollectionTypeLabel(type: string) {
  if (type === "savings") return "Savings";
  if (type === "loan") return "Aid Repayment";
  if (type === "share") return "Share Subscription";

  return type || "-";
}

function getStatusBadgeClass(status: string) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-xs font-black capitalize";

  if (status === "approved") {
    return `${base} bg-green-50 text-green-700`;
  }

  if (status === "rejected") {
    return `${base} bg-red-50 text-red-700`;
  }

  return `${base} bg-amber-50 text-amber-700`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function CollectionsModule() {
  const today = getLocalDateString();
  const yesterday = getLocalDateString(addDays(new Date(), -1));

  const [members, setMembers] = useState<Member[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingCollectionId, setProcessingCollectionId] = useState<
    string | null
  >(null);

  const [memberId, setMemberId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [collectionType, setCollectionType] = useState("savings");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [collectionDate, setCollectionDate] = useState(today);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(today);

  const [expectedAidCollectionsToday, setExpectedAidCollectionsToday] = useState<
  ExpectedAidCollection[]
>([]);

const [overdueAidCollections, setOverdueAidCollections] = useState<
  ExpectedAidCollection[]
>([]);

const [aidPortfolioSummary, setAidPortfolioSummary] =
  useState<AidPortfolioSummary | null>(null);


  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setIsLoading(true);

 await Promise.all([
  loadMembers(),
  loadAgents(),
  loadTeams(),
  loadCollections(),
  loadExpectedAidCollectionsToday(),
  loadOverdueAidCollections(),
  loadAidPortfolioSummary(),
]);

    setIsLoading(false);
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
      .from(COLLECTIONS_TABLE)
      .select(
        `
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
      `
      )
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
    } else {
      setTeamId("");
    }
  }

  function resetCollectionForm() {
    setMemberId("");
    setAgentId("");
    setTeamId("");
    setCollectionType("savings");
    setExpectedAmount("");
    setCollectedAmount("");
    setPaymentMethod("cash");
    setReference("");
    setNotes("");
    setCollectionDate(getLocalDateString());
  }

async function loadExpectedAidCollectionsToday() {
  const { data, error } = await supabase
    .from("v_expected_aid_collections_today")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    setMessage(error.message);
    setExpectedAidCollectionsToday([]);
    return;
  }

  setExpectedAidCollectionsToday((data as ExpectedAidCollection[]) || []);
}

async function loadOverdueAidCollections() {
  const { data, error } = await supabase
    .from("v_overdue_aid_collections")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    setMessage(error.message);
    setOverdueAidCollections([]);
    return;
  }

  setOverdueAidCollections((data as ExpectedAidCollection[]) || []);
}

async function loadAidPortfolioSummary() {
  const { data, error } = await supabase
    .from("v_aid_portfolio_summary")
    .select("*")
    .maybeSingle();

  if (error) {
    setMessage(error.message);
    setAidPortfolioSummary(null);
    return;
  }

  setAidPortfolioSummary(data as AidPortfolioSummary | null);
}


  async function recordCollection() {
    setMessage("");

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

    if (expected < 0 || collected < 0) {
      setMessage("Expected and collected amounts cannot be negative.");
      return;
    }

    if (!collectionDate) {
      setMessage("Collection date is required.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from(COLLECTIONS_TABLE).insert({
      member_id: memberId,
      agent_id: agentId,
      team_id: teamId || null,
      collection_type: collectionType,
      expected_amount: expected,
      collected_amount: collected,
      variance: collected - expected,
      payment_method: paymentMethod,
      reference: reference.trim() || null,
      status: "pending",
      notes: notes.trim() || null,
      collection_date: collectionDate,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Collection recorded and sent for approval.");
    resetCollectionForm();

    await loadCollections();

await Promise.all([
  loadCollections(),
  loadExpectedAidCollectionsToday(),
  loadOverdueAidCollections(),
  loadAidPortfolioSummary(),
]);

  }

  async function approveCollection(collection: Collection) {
    setMessage("");

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

    setProcessingCollectionId(collection.id);

  if (collection.collection_type === "savings") {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("post_approved_savings_collection", {
    p_collection_id: collection.id,
    p_approved_by: user?.id || null,
  });

  setProcessingCollectionId(null);

  if (error) {
    console.error("Error posting approved savings collection:", error);
    setMessage(error.message);
    return;
  }

  setMessage("Savings collection approved and posted successfully.");

  await Promise.all([
    loadCollections(),
    loadExpectedAidCollectionsToday(),
    loadOverdueAidCollections(),
    loadAidPortfolioSummary(),
  ]);

  console.log("Savings collection posting result:", data);

  return;
}

    if (collection.collection_type === "share") {
      const success = await approveShareCollection(collection);

      if (!success) {
        setProcessingCollectionId(null);
        return;
      }
    }

if (collection.collection_type === "loan") {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("post_approved_aid_collection", {
    p_collection_id: collection.id,
    p_approved_by: user?.id || null,
  });

  setProcessingCollectionId(null);

  if (error) {
    console.error("Error posting approved aid collection:", error);
    setMessage(error.message);
    return;
  }

  setMessage("Aid collection approved and posted successfully.");

  await Promise.all([
    loadCollections(),
    loadExpectedAidCollectionsToday(),
    loadOverdueAidCollections(),
    loadAidPortfolioSummary(),
  ]);

  console.log("Aid collection posting result:", data);

  return;
}

    const { error: approveError } = await supabase
      .from(COLLECTIONS_TABLE)
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", collection.id);

    setProcessingCollectionId(null);

    if (approveError) {
      setMessage(approveError.message);
      return;
    }

    setMessage("Collection approved successfully.");
    await loadCollections();
  }

  async function approveSavingsCollection(collection: Collection) {
    const amount = Number(collection.collected_amount || 0);

    if (amount <= 0) {
      setMessage("Savings amount must be greater than zero.");
      return false;
    }

    if (!collection.member_id) {
      setMessage("This savings collection is not linked to a member.");
      return false;
    }

    const memberName = collection.members?.full_name || "Savings Client";
    const agentName = collection.agents?.full_name || "Admin";

    const { data: existingAccount, error: accountLoadError } = await supabase
      .from("savings_accounts")
      .select("id, total_saved")
      .eq("member_id", collection.member_id)
      .maybeSingle();

    if (accountLoadError) {
      setMessage(accountLoadError.message);
      return false;
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
        return false;
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
        return false;
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
      return false;
    }

    return true;
  }

  async function approveShareCollection(collection: Collection) {
    const amount = Number(collection.collected_amount || 0);
    const sharesBought = Math.floor(amount / SHARE_PRICE);

    if (amount <= 0) {
      setMessage("Share subscription amount must be greater than zero.");
      return false;
    }

    if (sharesBought <= 0) {
      setMessage(
        `Share subscription must be at least ${formatMoney(SHARE_PRICE)}.`
      );
      return false;
    }

    if (!collection.member_id) {
      setMessage("This share collection is not linked to a member.");
      return false;
    }

    const { data: memberRecord, error: memberLoadError } = await supabase
      .from("members")
      .select("id, total_shares, portfolio_value")
      .eq("id", collection.member_id)
      .single();

    if (memberLoadError) {
      setMessage(memberLoadError.message);
      return false;
    }

    const updatedShares = Number(memberRecord.total_shares || 0) + sharesBought;
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
      return false;
    }

    return true;
  }
  async function rejectCollection(collection: Collection) {
    setMessage("");

    if (collection.status === "approved") {
      setMessage("Approved collections cannot be rejected.");
      return;
    }

    if (collection.status === "rejected") {
      setMessage("This collection has already been rejected.");
      return;
    }

    const confirmed = window.confirm("Reject this collection?");
    if (!confirmed) return;

    setProcessingCollectionId(collection.id);

    const { error } = await supabase
      .from(COLLECTIONS_TABLE)
      .update({
        status: "rejected",
      })
      .eq("id", collection.id);

    setProcessingCollectionId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Collection rejected.");
    await loadCollections();
  }

  function resetCollectionFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter(getLocalDateString());
  }

const pendingCollectionsAwaitingApproval = useMemo(() => {
  return collections.filter((item) => item.status === "pending");
}, [collections]);

  const yesterdayApprovedCollections = useMemo(() => {
    return collections.filter(
      (item) =>
        item.collection_date === yesterday && item.status === "approved"
    );
  }, [collections, yesterday]);
  const allPendingCollections = useMemo(() => {
  return collections.filter((item) => item.status === "pending");
}, [collections]);

const allApprovedCollections = useMemo(() => {
  return collections.filter((item) => item.status === "approved");
}, [collections]);

const pendingApprovalCount = pendingCollectionsAwaitingApproval.length;
const yesterdayApprovedCount = yesterdayApprovedCollections.length;
const allPendingCount = allPendingCollections.length;
const allApprovedCount = allApprovedCollections.length;

  const filteredCollections = useMemo(() => {
    return collections.filter((item) => {
      const search = searchTerm.trim().toLowerCase();

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

      const matchesDate = !dateFilter || item.collection_date === dateFilter;

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [collections, searchTerm, statusFilter, typeFilter, dateFilter]);

  const yesterdayExpected = yesterdayApprovedCollections.reduce(
    (sum, item) => sum + Number(item.expected_amount || 0),
    0
  );

  const yesterdayCollected = yesterdayApprovedCollections.reduce(
    (sum, item) => sum + Number(item.collected_amount || 0),
    0
  );

  const yesterdayVariance = yesterdayCollected - yesterdayExpected;

  const savingsTotal = yesterdayApprovedCollections
    .filter((item) => item.collection_type === "savings")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const loanTotal = yesterdayApprovedCollections
    .filter((item) => item.collection_type === "loan")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);

  const shareTotal = yesterdayApprovedCollections
    .filter((item) => item.collection_type === "share")
    .reduce((sum, item) => sum + Number(item.collected_amount || 0), 0);


      const expectedAidTodayCount = expectedAidCollectionsToday.length;

  const expectedAidTodayAmount = expectedAidCollectionsToday.reduce(
    (sum, item) => sum + Number(item.amount_due || 0),
    0
  );

  const overdueAidCount = overdueAidCollections.length;

  const overdueAidAmount = overdueAidCollections.reduce(
    (sum, item) => sum + Number(item.amount_due || 0),
    0
  );
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
<MetricCard
  title="Aid Collections Due Today"
  value={expectedAidTodayCount.toString()}
/>

<MetricCard
  title="Aid Amount Due Today"
  value={formatMoney(expectedAidTodayAmount)}
/>

<MetricCard
  title="Overdue Aid Collections"
  value={overdueAidCount.toString()}
/>

<MetricCard
  title="Overdue Aid Amount"
  value={formatMoney(overdueAidAmount)}
/>

<MetricCard
  title="Active Aid Facilities"
  value={String(aidPortfolioSummary?.active_aid_count || 0)}
/>

<MetricCard
  title="Active Outstanding Aid"
  value={formatMoney(aidPortfolioSummary?.active_outstanding_balance || 0)}
/>
        <MetricCard
          title="Yesterday Approved Expected"
          value={formatMoney(yesterdayExpected)}
        />
        <MetricCard
          title="Yesterday Approved Collected"
          value={formatMoney(yesterdayCollected)}
        />
        <MetricCard
          title="Yesterday Approved Variance"
          value={formatMoney(yesterdayVariance)}
        />
<MetricCard
  title="Pending Collections Awaiting Approval"
  value={pendingApprovalCount.toString()}
/>
<MetricCard
  title="Yesterday Approved Collections"
  value={yesterdayApprovedCount.toString()}
/>

<MetricCard
  title="All Pending Collections"
  value={allPendingCount.toString()}
/>

<MetricCard
  title="All Approved Collections"
  value={allApprovedCount.toString()}
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

          <Button
            onClick={recordCollection}
            disabled={isSubmitting}
            className="mt-6 px-6 py-3"
          >
            {isSubmitting ? "Recording..." : "Record Collection"}
          </Button>
        </CardContent>
      </Card>

     <Card className="border-slate-200 bg-white shadow-sm">
  <CardContent className="p-8">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-2xl font-black text-[#0D2D6E]">
        Today&apos;s Aid Collections Due
      </h2>

      <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
        {expectedAidTodayCount}
      </span>
    </div>

    <p className="mt-2 text-sm font-semibold text-slate-500">
      Expected aid repayments due today from active aid facilities.
    </p>

    <ExpectedAidCollectionsTable
      items={expectedAidCollectionsToday}
      emptyText="No aid collections are due today."
    />
  </CardContent>
</Card>

<Card className="border-slate-200 bg-white shadow-sm">
  <CardContent className="p-8">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-2xl font-black text-[#0D2D6E]">
        Overdue Aid Collections
      </h2>

      <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700">
        {overdueAidCount}
      </span>
    </div>

    <p className="mt-2 text-sm font-semibold text-slate-500">
      Aid repayments that are overdue and still pending or partially paid.
    </p>

    <ExpectedAidCollectionsTable
      items={overdueAidCollections}
      emptyText="No overdue aid collections."
    />
  </CardContent>
</Card> 


      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
<div className="flex flex-wrap items-center gap-3">
  <h2 className="text-2xl font-black text-[#0D2D6E]">
    Pending Collections Awaiting Approval
  </h2>

  <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
    {pendingApprovalCount}
  </span>
</div>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Showing all collections awaiting finance approval.
          </p>

<CollectionsTable
  items={pendingCollectionsAwaitingApproval}
  emptyText="No collections are currently awaiting approval."
  showActions
  onApprove={approveCollection}
  onReject={rejectCollection}
  processingCollectionId={processingCollectionId}
/>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
       <div className="flex flex-wrap items-center gap-3">
  <h2 className="text-2xl font-black text-[#0D2D6E]">
Yesterday&apos;s Approved Collections
  </h2>

  <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
    {yesterdayApprovedCount}
  </span>
</div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Showing approved collections recorded for {yesterday}.
          </p>

          <CollectionsTable
            items={yesterdayApprovedCollections}
            emptyText="No approved collections for yesterday."
            processingCollectionId={processingCollectionId}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#0D2D6E]">
                Collections Search & History
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Search all collections by member, agent, type, status, and date.
              </p>
            </div>

            <Button onClick={resetCollectionFilters} className="px-5 py-3">
              Reset Filters
            </Button>
          </div>
<div className="mt-6 grid gap-4 md:grid-cols-4">
  <SmallMetricCard
    title="Filtered Results"
    value={filteredCollections.length.toString()}
  />

  <SmallMetricCard
    title="Pending"
    value={
      filteredCollections
        .filter((item) => item.status === "pending")
        .length.toString()
    }
  />

  <SmallMetricCard
    title="Approved"
    value={
      filteredCollections
        .filter((item) => item.status === "approved")
        .length.toString()
    }
  />

  <SmallMetricCard
    title="Rejected"
    value={
      filteredCollections
        .filter((item) => item.status === "rejected")
        .length.toString()
    }
  />
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
            <option value="loan">Aid Repayment</option>
              <option value="share">Share Subscription</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </div>

          {isLoading ? (
            <p className="mt-6 font-semibold text-slate-600">
              Loading collections...
            </p>
          ) : (
            <CollectionsTable
              items={filteredCollections}
              emptyText="No collections match the selected filters."
              showActions
              onApprove={approveCollection}
              onReject={rejectCollection}
              processingCollectionId={processingCollectionId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CollectionsTable({
  items,
  emptyText,
  showActions = false,
  onApprove,
  onReject,
  processingCollectionId,
}: {
  items: Collection[];
  emptyText: string;
  showActions?: boolean;
  onApprove?: (collection: Collection) => void;
  onReject?: (collection: Collection) => void;
  processingCollectionId?: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-6 font-semibold text-slate-600">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[1250px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
            <th className="py-4">Date</th>
            <th className="py-4">Member</th>
            <th className="py-4">Agent</th>
            <th className="py-4">Team</th>
            <th className="py-4">Type</th>
            <th className="py-4">Expected</th>
            <th className="py-4">Collected</th>
            <th className="py-4">Variance</th>
            <th className="py-4">Method</th>
            <th className="py-4">Reference</th>
            <th className="py-4">Status</th>
            <th className="py-4">Approved At</th>
            {showActions && <th className="py-4">Action</th>}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const variance = getVariance(item);
            const isProcessing = processingCollectionId === item.id;

            return (
              <tr key={item.id} className="border-b">
                <td className="py-4 font-semibold">
                  {item.collection_date || "-"}
                </td>

                <td className="py-4 font-bold text-[#0D2D6E]">
                  {item.members?.full_name || "-"}
                  <br />
                  <span className="text-xs font-semibold text-slate-500">
                    {item.members?.member_number || ""}
                  </span>
                </td>

                <td className="py-4">
                  {item.agents?.full_name || "-"}
                  <br />
                  <span className="text-xs font-semibold text-slate-500">
                    {item.agents?.agent_code || ""}
                  </span>
                </td>

                <td className="py-4">
                  {item.agent_teams?.team_name || "-"}
                </td>

                <td className="py-4">
                  {getCollectionTypeLabel(item.collection_type)}
                </td>

                <td className="py-4 font-bold">
                  {formatMoney(item.expected_amount)}
                </td>

                <td className="py-4 font-bold">
                  {formatMoney(item.collected_amount)}
                </td>

                <td
                  className={
                    variance < 0
                      ? "py-4 font-black text-red-600"
                      : "py-4 font-black text-green-700"
                  }
                >
                  {formatMoney(variance)}
                </td>

                <td className="py-4 capitalize">
                  {item.payment_method?.replaceAll("_", " ") || "-"}
                </td>

                <td className="py-4">
                  {item.reference || "-"}
                </td>

                <td className="py-4">
                  <span className={getStatusBadgeClass(item.status)}>
                    {item.status}
                  </span>
                </td>

                <td className="py-4">
                  {formatDateTime(item.approved_at)}
                </td>

                {showActions && (
                  <td className="py-4">
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onApprove?.(item)}
                          disabled={isProcessing}
                          className="px-4 py-2"
                        >
                          {isProcessing ? "Working..." : "Approve"}
                        </Button>

                        <button
                          onClick={() => onReject?.(item)}
                          disabled={isProcessing}
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function SmallMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-black text-[#0D2D6E]">{value}</p>
    </div>
  );
}
function ExpectedAidCollectionsTable({
  items,
  emptyText,
}: {
  items: ExpectedAidCollection[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="mt-6 font-semibold text-slate-600">{emptyText}</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-widest text-slate-500">
            <th className="py-4">Member</th>
            <th className="py-4">Business</th>
            <th className="py-4">Aid No.</th>
            <th className="py-4">Installment</th>
            <th className="py-4">Due Date</th>
            <th className="py-4">Expected</th>
            <th className="py-4">Paid</th>
            <th className="py-4">Amount Due</th>
            <th className="py-4">Outstanding Aid</th>
            <th className="py-4">Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.schedule_id} className="border-b">
              <td className="py-4 font-bold text-[#0D2D6E]">
                {item.member_name || "-"}
                <br />
                <span className="text-xs font-semibold text-slate-500">
                  {item.member_number || ""}
                </span>
              </td>

              <td className="py-4">{item.business_name || "-"}</td>

              <td className="py-4 font-semibold">
                {item.aid_number || "-"}
              </td>

              <td className="py-4 font-bold">
                #{item.installment_number}
              </td>

              <td className="py-4">{item.due_date}</td>

              <td className="py-4 font-bold">
                {formatMoney(item.expected_amount)}
              </td>

              <td className="py-4 font-bold">
                {formatMoney(item.paid_amount)}
              </td>

              <td className="py-4 font-black text-red-600">
                {formatMoney(item.amount_due)}
              </td>

              <td className="py-4 font-bold text-[#0D2D6E]">
                {formatMoney(item.outstanding_balance)}
              </td>

              <td className="py-4 capitalize">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {item.repayment_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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