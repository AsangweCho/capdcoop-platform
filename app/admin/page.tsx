"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import AgentsModule from "./AgentsModule";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminTabKey =
  | "members"
  | "loans"
  | "payments"
  | "collections"
  | "savings"
  | "agents"
  | "commissions"
  | "command"
  | "reports"
  | "arrears"
  | "audit"
  | "admins";

type CurrentAdmin = {
  id: string;
  auth_user_id: string;
  full_name?: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  permissions: string[];
};

const ADMIN_TABS: {
  value: AdminTabKey;
  label: string;
  permission: string;
}[] = [
  {
    value: "members",
    label: "Members",
    permission: "members.manage",
  },
  {
    value: "loans",
    label: "Aid",
    permission: "aid.manage",
  },
  {
    value: "payments",
    label: "Payments",
    permission: "payments.manage",
  },
  {
    value: "collections",
    label: "Collections",
    permission: "collections.manage",
  },
  {
    value: "savings",
    label: "Savings",
    permission: "savings.manage",
  },
  {
    value: "agents",
    label: "Agents",
    permission: "agents.manage",
  },
  {
    value: "commissions",
    label: "Commissions",
    permission: "agents.manage",
  },
  {
    value: "command",
    label: "Command Centre",
    permission: "reports.view",
  },
  {
    value: "reports",
    label: "Reports",
    permission: "reports.view",
  },
  {
    value: "arrears",
    label: "Arrears",
    permission: "aid.manage",
  },
  {
    value: "audit",
    label: "Audit Logs",
    permission: "audit.view",
  },
  {
    value: "admins",
    label: "Admins",
    permission: "admins.manage",
  },
];

const formatRole = (role: string) =>
  role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminDashboard() {
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminError, setAdminError] = useState("");

  const [activeTab, setActiveTab] = useState<AdminTabKey>("members");

  useEffect(() => {
    async function checkAdminAccess() {
      setCheckingAdmin(true);

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const user = sessionData.session.user;

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !adminUser) {
        console.error(error);
        setAdminError("Unable to verify admin access.");
        setCheckingAdmin(false);
        return;
      }

      let permissions: string[] = [];

      if (adminUser.role !== "super_admin") {
        const { data: permissionRows, error: permissionError } = await supabase
          .from("admin_permissions")
          .select("permission_key, is_enabled")
          .eq("admin_user_id", adminUser.id)
          .eq("is_enabled", true);

        if (permissionError) {
          console.error(permissionError);
          setAdminError("Unable to load admin permissions.");
          setCheckingAdmin(false);
          return;
        }

        permissions = (permissionRows || []).map(
          (permission) => permission.permission_key
        );
      }

      setCurrentAdmin({
        ...adminUser,
        permissions,
      });

      setCheckingAdmin(false);
    }

    checkAdminAccess();
  }, [router]);

  const isSuperAdmin = currentAdmin?.role === "super_admin";

  const hasPermission = (permissionKey: string) => {
    if (!currentAdmin) return false;
    if (isSuperAdmin) return true;

    return currentAdmin.permissions.includes(permissionKey);
  };

  const visibleTabs = useMemo(() => {
    if (!currentAdmin) return [];

    return ADMIN_TABS.filter((tab) => hasPermission(tab.permission));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdmin]);

  useEffect(() => {
    if (!currentAdmin || visibleTabs.length === 0) return;

    const activeTabIsAllowed = visibleTabs.some((tab) => tab.value === activeTab);

    if (!activeTabIsAllowed) {
      setActiveTab(visibleTabs[0].value);
    }
  }, [activeTab, currentAdmin, visibleTabs]);

  const currentAdminWithPermissions = currentAdmin
    ? {
        ...currentAdmin,
        hasPermission,
      }
    : null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

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

  if (!currentAdminWithPermissions) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-semibold text-red-600">Admin session not found.</p>
      </main>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
                Admin Control Centre
              </div>
            </div>

            <Button
              onClick={handleLogout}
              className="bg-red-600 px-5 py-3 text-white hover:bg-red-700"
            >
              Logout
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-xl font-black text-amber-800">
              No permissions assigned
            </h1>
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Your admin account is active, but no permission group has been
              assigned yet. Please contact the Super Admin.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 md:block">
              Admin Control Centre
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-black text-[#0D2D6E]">
                {currentAdmin.full_name || currentAdmin.email}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {currentAdmin.email}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {formatRole(currentAdmin.role)}
            </div>

            <Button
              onClick={handleLogout}
              className="bg-red-600 px-5 py-3 text-white hover:bg-red-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-[#0D2D6E]">
            CAPDCOOP Admin Dashboard
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Visible modules are controlled by the permissions assigned to your
            admin account.
          </p>

          {!isSuperAdmin && (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentAdmin.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700"
                >
                  {permission}
                </span>
              ))}
            </div>
          )}

          {isSuperAdmin && (
            <div className="mt-4 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
              Full System Access
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AdminTabKey)}
        >
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-white p-2">
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {hasPermission("members.manage") && (
            <TabsContent value="members">
              <MembersModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("aid.manage") && (
            <TabsContent value="loans">
              <LoanModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("payments.manage") && (
            <TabsContent value="payments">
              <PaymentModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("collections.manage") && (
            <TabsContent value="collections">
              <CollectionsModule />
            </TabsContent>
          )}

          {hasPermission("savings.manage") && (
            <TabsContent value="savings">
              <SavingsModule />
            </TabsContent>
          )}

          {hasPermission("agents.manage") && (
            <TabsContent value="agents">
              <AgentsModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("agents.manage") && (
            <TabsContent value="commissions">
              <CommissionsModule />
            </TabsContent>
          )}

          {hasPermission("reports.view") && (
            <TabsContent value="command">
              <CommandCentreModule />
            </TabsContent>
          )}

          {hasPermission("reports.view") && (
            <TabsContent value="reports">
              <ReportsModule />
            </TabsContent>
          )}

          {hasPermission("aid.manage") && (
            <TabsContent value="arrears">
              <ArrearsModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("audit.view") && (
            <TabsContent value="audit">
              <AuditLogsModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}

          {hasPermission("admins.manage") && (
            <TabsContent value="admins">
              <AdminUsersModule currentAdmin={currentAdminWithPermissions} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}