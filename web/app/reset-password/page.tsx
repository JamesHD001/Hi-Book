"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Your password must contain at least 8 characters.");
    if (password !== confirm) return setError("The passwords do not match.");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    router.replace("/login?reset=success");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm font-semibold text-blue-600">Hi!Book</Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-950">Choose a new password</h1>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="New password" className="w-full rounded-xl border border-gray-300 px-4 py-3" />
          <input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full rounded-xl border border-gray-300 px-4 py-3" />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
