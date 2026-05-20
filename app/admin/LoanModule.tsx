"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Loan = {
  id: string;
  member_id: string;
  business_name: string;
  loan_amount: number;
  duration_days: number;
  daily_payment_amount: number;
  total_expected_repayment: number;
  status: string;
  created_at: string;
};

interface LoanModuleProps {
  currentAdmin: any;
}

export default function LoanModule({ currentAdmin }: LoanModuleProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

  useEffect(() => {
    async function loadLoans() {
      setLoadingLoans(true);
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setLoans(data || []);
      setLoadingLoans(false);
    }
    loadLoans();
  }, []);

  const canManagePayments =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "finance";

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Loan Management</h2>
        {loadingLoans ? (
          <p>Loading loans...</p>
        ) : loans.length === 0 ? (
          <p>No loans created yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Business</th>
                <th>Amount</th>
                <th>Daily Payment</th>
                <th>Duration</th>
                <th>Total Repayment</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b">
                  <td>{loan.business_name}</td>
                  <td>{loan.loan_amount}</td>
                  <td>{loan.daily_payment_amount}</td>
                  <td>{loan.duration_days}</td>
                  <td>{loan.total_expected_repayment}</td>
                  <td>{loan.status}</td>
                  <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}