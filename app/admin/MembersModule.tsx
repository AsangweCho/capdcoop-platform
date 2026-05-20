"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MemberRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  id_card_number: string | null;
  member_number: string;
  membership_status: string;
  total_shares: number;
  portfolio_value: number;
  declared_dividends: number;
  created_at: string;
};

interface MembersModuleProps {
  currentAdmin: any;
}

export default function MembersModule({ currentAdmin }: MembersModuleProps) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

 useEffect(() => {
  async function loadMembers() {
    setLoadingMembers(true);

    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        email,
        phone,
        id_card_number,
        member_number,
        membership_status,
        total_shares,
        portfolio_value,
        declared_dividends,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MEMBERS LOAD ERROR:", error);
      alert(error.message);
      setMembers([]);
      setLoadingMembers(false);
      return;
    }

    console.log("MEMBERS LOADED:", data);
    setMembers(data || []);
    setLoadingMembers(false);
  }

  loadMembers();
}, []);
  const canManageMembers =
    currentAdmin?.role === "super_admin" ||
    currentAdmin?.role === "admin" ||
    currentAdmin?.role === "membership_officer";

  if (loadingMembers) return <p>Loading members...</p>;

  return (
    <Card className="mt-6 border-slate-200 bg-white shadow-sm">
      <CardContent>
        <h2 className="text-xl font-bold mb-4">Members</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>ID Card</th>
              <th>Member #</th>
              <th>Shares</th>
              <th>Portfolio</th>
              <th>Dividends</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
         <tbody>
  {members.map((m) => (
    <tr key={m.id} className="border-b">
      <td className="py-3">{m.full_name}</td>
      <td className="py-3">{m.email}</td>
      <td className="py-3">{m.phone || "-"}</td>
      <td className="py-3">{m.id_card_number || "-"}</td>
      <td className="py-3">{m.member_number || "-"}</td>
      <td className="py-3">{m.total_shares || 0}</td>
      <td className="py-3">FCFA {Number(m.portfolio_value || 0).toLocaleString()}</td>
      <td className="py-3">FCFA {Number(m.declared_dividends || 0).toLocaleString()}</td>
      <td className="py-3">{m.membership_status || "-"}</td>
      <td className="py-3">
        {m.created_at ? new Date(m.created_at).toLocaleDateString() : "-"}
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </CardContent>
    </Card>
  );
}