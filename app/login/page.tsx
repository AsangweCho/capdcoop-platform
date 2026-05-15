"use client";

import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setError("Authentication failed.");
      setLoading(false);
      return;
    }

    const role = userData.user.user_metadata?.role;

    if (role === "admin") {
      window.location.href = "/admin";
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("must_change_password")
      .eq("auth_user_id", userData.user.id)
      .single();

    if (memberError || !memberData) {
      setError("Member record not found.");
      setLoading(false);
      return;
    }

    if (memberData.must_change_password) {
      window.location.href = "/change-password";
    } else {
      window.location.href = "/member";
    }
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
              Access your CAPDCOOP member or administrative account securely.
              Track membership participation, business applications, and
              structured financial activity in one platform.
            </p>
          </div>

          <div className="flex gap-6 text-sm font-semibold text-white/60">
            <span>Secure access</span>
            <span>Member dashboard</span>
            <span>Administrative workflow</span>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo compact />
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
                  type="email"
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
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[var(--capd-navy)]"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--capd-navy)] py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              CAPDCOOP Cooperative Platform
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}