"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setError("Authentication failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError) {
      setError(adminError.message);
      setLoading(false);
      return;
    }

    if (adminUser) {
      router.replace("/admin");
      return;
    }

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("id, status, must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (agentError) {
      setError(agentError.message);
      setLoading(false);
      return;
    }

    if (agentData) {
      if (agentData.status !== "active") {
        setError("Your agent account is not active.");
        setLoading(false);
        return;
      }

      router.replace("/agent");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    if (!memberData) {
      setError("No admin, agent, or member profile found for this account.");
      setLoading(false);
      return;
    }

    if (memberData.must_change_password) {
      router.replace("/change-password");
      return;
    }

    router.replace("/member");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden bg-[var(--capd-navy)] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div>
            <BrandLogo white horizontal={false} />
          </div>

          <div>
            <h1 className="max-w-xl text-5xl font-black leading-tight text-white">
              Structured cooperative finance for disciplined growth.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-white/75">
              Access your CAPDCOOP member, agent, or administrative account
              securely.
            </p>
          </div>

          <div className="flex gap-6 text-sm font-semibold text-white/60">
            <span>Secure access</span>
            <span>Member dashboard</span>
            <span>Agent operations</span>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo compact />
            </div>

            <div className="mb-6">
              <Link
                href="/"
                className="inline-flex items-center rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              >
                Back to Home
              </Link>
            </div>

            <h2 className="text-center text-3xl font-black text-[var(--capd-navy)]">
              Platform Login
            </h2>

            <p className="mt-3 text-center text-slate-600">
              Sign in to your CAPDCOOP account.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[var(--capd-navy)]"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[var(--capd-navy)]"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--capd-navy)] px-6 py-4 font-black text-white transition hover:bg-[var(--capd-green)] disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}