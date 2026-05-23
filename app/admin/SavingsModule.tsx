"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SavingsAccount = {
  id: string;
  client_name: string;
  phone: string | null;
  account_number: string | null;
  total_saved: number;
  total_withdrawn: number;
  monthly_fee_percent: number;
  status: string;
  start_date: string;
  created_at: string;
};

type SavingsTransaction = {
  id: string;
  savings_account_id: string;
  amount: number;
  payment_method: string;
  transaction_type: string;
  collected_by: string | null;
  created_at: string;
};

export default function SavingsModule() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [agentName, setAgentName] = useState("");

  const [selectedAccount, setSelectedAccount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, []);

  async function loadAccounts() {
    const { data, error } = await supabase
      .from("savings_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAccounts(data || []);
  }

  async function loadTransactions() {
    const { data, error } = await supabase
      .from("savings_transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactions(data || []);
  }

  function generateAccountNumber() {
    return `SAV-${Date.now()}`;
  }

  async function createSavingsAccount() {
    if (!clientName || !phone) {
      setMessage("Client name and phone are required.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("savings_accounts").insert({
      client_name: clientName,
      phone,
      agent_name: agentName,
      account_number: generateAccountNumber(),
      monthly_fee_percent: 2,
      status: "active",
      total_saved: 0,
      total_withdrawn: 0,
      start_date: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Savings account created successfully.");
      setClientName("");
      setPhone("");
      setAgentName("");
      loadAccounts();
    }

    setLoading(false);
  }

  async function addDeposit() {
    if (!selectedAccount || !depositAmount) {
      setMessage("Select account and amount.");
      return;
    }

    const amount = Number(depositAmount);

    if (amount <= 0) {
      setMessage("Deposit amount must be greater than zero.");
      return;
    }

    const account = accounts.find((a) => a.id === selectedAccount);

    if (!account) {
      setMessage("Account not found.");
      return;
    }

    const { error: txError } = await supabase
      .from("savings_transactions")
      .insert({
        savings_account_id: selectedAccount,
        amount,
        payment_method: "cash",
        transaction_type: "deposit",
        collected_by: "admin",
      });

    if (txError) {
      setMessage(txError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("savings_accounts")
      .update({
        total_saved: Number(account.total_saved) + amount,
      })
      .eq("id", selectedAccount);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setMessage("Deposit recorded successfully.");
    setDepositAmount("");
    loadAccounts();
    loadTransactions();
  }

  function daysBetween(startDate: string) {
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  async function processWithdrawal(account: SavingsAccount) {
    const available =
      Number(account.total_saved) - Number(account.total_withdrawn);

    if (available <= 0) {
      setMessage("No funds available.");
      return;
    }

    const daysSaved = daysBetween(account.start_date);

    if (daysSaved < 30) {
      setMessage("Withdrawal only allowed after 30 days.");
      return;
    }

    if (!confirm(`Process withdrawal for ${account.client_name}?`)) {
      return;
    }

    const deduction =
      available * (Number(account.monthly_fee_percent) / 100);

    const net = available - deduction;

    const { error: withdrawalError } = await supabase
      .from("savings_withdrawals")
      .insert({
        savings_account_id: account.id,
        gross_amount: available,
        deduction_percent: account.monthly_fee_percent,
        deduction_amount: deduction,
        net_amount: net,
        status: "approved",
      });

    if (withdrawalError) {
      setMessage(withdrawalError.message);
      return;
    }

    await supabase
      .from("savings_accounts")
      .update({
        total_withdrawn: Number(account.total_withdrawn) + net,
        status: "withdrawn",
      })
      .eq("id", account.id);

    setMessage("Withdrawal processed successfully.");
    loadAccounts();
  }

  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.phone || "").includes(search)
    );
  }, [accounts, search]);

  const totalPortfolio = accounts.reduce(
    (sum, a) => sum + Number(a.total_saved),
    0
  );

  const activeSavers = accounts.filter((a) => a.status === "active").length;

  const todayCollections = transactions
    .filter(
      (t) =>
        new Date(t.created_at).toDateString() === new Date().toDateString()
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const feeEarnings = accounts.reduce((sum, a) => {
    const available =
      Number(a.total_saved) - Number(a.total_withdrawn);

    return sum + available * (Number(a.monthly_fee_percent) / 100);
  }, 0);

  return (
    <div className="space-y-8">
      {/* DASHBOARD */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total Portfolio" value={`${totalPortfolio.toLocaleString()} FCFA`} />
        <Card title="Active Savers" value={activeSavers.toString()} />
        <Card title="Today's Collections" value={`${todayCollections.toLocaleString()} FCFA`} />
        <Card title="Projected Fees" value={`${feeEarnings.toLocaleString()} FCFA`} />
      </div>

      {/* CREATE ACCOUNT */}
      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black text-[#0D2D6E]">
          Create Savings Account
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client Name"
            className="rounded-xl border p-3"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="rounded-xl border p-3"
          />
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent Name"
            className="rounded-xl border p-3"
          />
        </div>

        <button
          onClick={createSavingsAccount}
          disabled={loading}
          className="mt-6 rounded-2xl bg-[#0D2D6E] px-6 py-3 font-bold text-white"
        >
          Create Account
        </button>
      </section>

      {/* DEPOSIT */}
      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black text-[#0D2D6E]">Daily Deposit</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-xl border p-3"
          >
            <option value="">Select Savings Account</option>
            {accounts.map((account) => {
              const available =
                Number(account.total_saved) -
                Number(account.total_withdrawn);

              return (
                <option key={account.id} value={account.id}>
                  {account.client_name} — {available.toLocaleString()} FCFA
                </option>
              );
            })}
          </select>

          <input
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Deposit Amount"
            className="rounded-xl border p-3"
          />
        </div>

        <button
          onClick={addDeposit}
          className="mt-6 rounded-2xl bg-[#009B5A] px-6 py-3 font-bold text-white"
        >
          Record Deposit
        </button>
      </section>

      {/* SEARCH */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by client name or phone"
        className="w-full rounded-xl border p-4"
      />

      {/* ACCOUNTS */}
      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black text-[#0D2D6E]">Savings Accounts</h2>

        <div className="mt-6 space-y-4">
          {filteredAccounts.map((account) => {
            const available =
              Number(account.total_saved) -
              Number(account.total_withdrawn);

            return (
              <div
                key={account.id}
                className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-black">{account.client_name}</p>
                  <p>Saved: {account.total_saved.toLocaleString()} FCFA</p>
                  <p>Available: {available.toLocaleString()} FCFA</p>
                  <p>Days Saved: {daysBetween(account.start_date)}</p>
                </div>

                <button
                  disabled={available <= 0}
                  onClick={() => processWithdrawal(account)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                  Withdraw
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* TRANSACTIONS */}
      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black text-[#0D2D6E]">
          Recent Transactions
        </h2>

        <div className="mt-6 space-y-3">
          {transactions.slice(0, 15).map((tx) => (
            <div
              key={tx.id}
              className="flex justify-between rounded-xl border p-4"
            >
              <span>{tx.transaction_type}</span>
              <span>{Number(tx.amount).toLocaleString()} FCFA</span>
              <span>{tx.collected_by}</span>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-slate-100 p-4 font-semibold">
          {message}
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#0D2D6E]">{value}</p>
    </div>
  );
}