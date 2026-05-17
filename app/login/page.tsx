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
      email,
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();


    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (!profile) {
      setError("User profile not found.");
      setLoading(false);
      return;
    }

   console.log("PROFILE:", profile);
    if (profile.role === "admin" || profile.role === "super_admin") {
  window.location.href = "/admin";
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
      setError("Member record not found.");
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
                                   <p className="mt-6 text-center text-sm text-slate-600">
  Not yet a member?{" "}
  <Link href="/membership/register" className="font-bold text-[var(--capd-navy)]">
    Create an account
  </Link>
</p>
              CAPDCOOP Cooperative Platform
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}