"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function MembershipRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessSector, setBusinessSector] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "Unable to create account.");
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      role: "member",
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase.from("members").insert({
      auth_user_id: userId,
      full_name: fullName,
      email,
      phone,
      date_of_birth: dateOfBirth,
      gender,
      city,
      national_id_number: nationalIdNumber || null,
      occupation,
      business_name: businessName || null,
      business_sector: businessSector,
      member_number: null,
      membership_status: "pending",
      total_shares: 0,
      portfolio_value: 0,
      declared_dividends: 0,
      must_change_password: false,
    });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Your account has been created successfully. Our membership team will contact you shortly for subscription and activation."
    );

    setFullName("");
    setEmail("");
    setPhone("");
    setDateOfBirth("");
    setGender("");
    setCity("");
    setNationalIdNumber("");
    setOccupation("");
    setBusinessName("");
    setBusinessSector("");
    setPassword("");
    setConfirmPassword("");

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo />

          <div className="flex items-center gap-3">
            <Link
              href="/membership"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[var(--capd-navy)] hover:bg-slate-50"
            >
              Back to Membership
            </Link>

            <Link
              href="/"
              className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-[var(--capd-navy)] p-8 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-gold)]">
              Membership Registration
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight">
              Create your CAPDCOOP member account.
            </h1>

            <p className="mt-5 text-white/75">
              Register your interest, create your account, and our membership
              team will contact you for subscription and activation.
            </p>

            <div className="mt-8 space-y-4 text-sm text-white/80">
              <p>• Submit your membership details securely</p>
              <p>• Get contacted by our membership team</p>
              <p>• Subscribe and activate your member account</p>
              <p>• Access cooperative services after validation</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-black text-[var(--capd-navy)]">
              Membership Enquiry Form
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Complete the form below. Your account will remain pending until
              our team validates your membership subscription.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Full Name"
                />

                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Email Address"
                />

                <input
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Phone Number"
                />

                <input
                  required
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />

                <select
                  required
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option value="">Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>

                <input
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="City / Location"
                />

                <input
                  value={nationalIdNumber}
                  onChange={(event) =>
                    setNationalIdNumber(event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="National ID Number (optional)"
                />

                <input
                  required
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Occupation"
                />

                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Business Name (if any)"
                />

                <input
                  required
                  value={businessSector}
                  onChange={(event) => setBusinessSector(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Business Sector / Industry"
                />

                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Password"
                />

                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Confirm Password"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--capd-navy)] py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create My Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[var(--capd-navy)]">
                Login here
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}