"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    if (!password || password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      setMessage(passwordError.message);
      setSaving(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage("User session not found.");
      setSaving(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("members")
      .update({
        must_change_password: false,
      })
      .eq("auth_user_id", userData.user.id);

    if (memberError) {
      setMessage(memberError.message);
      setSaving(false);
      return;
    }

    window.location.href = "/member";
  }

  return (
    <main className="min-h-screen bg-[var(--capd-bg)] flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="text-3xl font-black text-[var(--capd-navy)]">
            Change Your Password
          </h1>

          <p className="mt-3 text-slate-600">
            For security, you must set your own password before continuing.
          </p>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Enter new password"
          />

          {message && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {message}
            </div>
          )}

          <Button
            onClick={updatePassword}
            disabled={saving}
            className="mt-6 w-full py-3"
          >
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}