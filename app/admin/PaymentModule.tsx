"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
};

interface PaymentModuleProps {
  currentAdmin: any;
}

export default function PaymentModule({ currentAdmin }: PaymentModuleProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setPayments(data || []);
      setLoadingPayments(false);
    }
    loadPayments();
  }, []);

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Payment Validation Queue</h2>
        {loadingPayments ? (
          <p>Loading payments...</p>
        ) : payments.length === 0 ? (
          <p>No payments submitted.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td>{p.member_id}</td>
                  <td>{p.amount}</td>
                  <td>{p.payment_method}</td>
                  <td>{p.payment_status}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}