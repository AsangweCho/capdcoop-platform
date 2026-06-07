"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, FileCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";
 import SavingsModule from "./SavingsModule";
import MembersModule from "./MembersModule";
import LoanModule from "./LoanModule";
import PaymentModule from "./PaymentModule";
import AuditLogsModule from "./AuditLogsModule";
import AdminUsersModule from "./AdminUsersModule";
import CommissionsModule from "./CommissionsModule";
import CollectionsModule from "./CollectionsModule";
import CommandCentreModule from "./CommandCentreModule";
import ReportsModule from "./ReportsModule";
import ArrearsModule from "./ArrearsModule";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentsModule from "./AgentsModule";

export default function AdminDashboard() {
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminError, setAdminError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "members" | "loans" | "payments" | "audit" | "admins"
  >("members");

  // Check current admin
  useEffect(() => {
    async function checkAdminAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return router.replace("/login");

      const user = sessionData.session.user;
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !adminUser) {
        setAdminError("Unable to verify admin access.");
        setCheckingAdmin(false);
        return;
      }

      setCurrentAdmin(adminUser);
      setCheckingAdmin(false);
    }

    checkAdminAccess();
  }, []);

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-semibold text-slate-600">Checking admin access...</p>
      </main>
    );
  }

  if (adminError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-semibold text-red-600">{adminError}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
              Admin Control Centre
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentAdmin && (
              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                {currentAdmin.role.replace("_", " ").toUpperCase()}
              </div>
            )}
            <Button
              onClick={() => router.replace("/login")}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="loans">Aid</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="command">Command Centre</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="arrears">Arrears</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MembersModule currentAdmin={currentAdmin} />
          </TabsContent>

          <TabsContent value="loans">
            <LoanModule currentAdmin={currentAdmin} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentModule currentAdmin={currentAdmin} />
          </TabsContent>
          <TabsContent value="collections">
  <CollectionsModule />
</TabsContent>
    <TabsContent value="savings">
  <SavingsModule />
</TabsContent>
 <TabsContent value="agents">
  <AgentsModule currentAdmin={currentAdmin} />
</TabsContent>
<TabsContent value="commissions">
  <CommissionsModule />
</TabsContent>
<TabsContent value="command">
  <CommandCentreModule />
</TabsContent>
   <TabsContent value="reports">
  <ReportsModule />
</TabsContent>
<TabsContent value="arrears">
  <ArrearsModule currentAdmin={currentAdmin} />
</TabsContent>
          <TabsContent value="audit">
            <AuditLogsModule currentAdmin={currentAdmin} />
          </TabsContent>

          <TabsContent value="admins">
            <AdminUsersModule currentAdmin={currentAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}