"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "UNDISCLOSED", label: "Prefer not to disclose" },
] as const;

function calculateAge(date: string) {
  const birth = new Date(`${date}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", dateOfBirth: "", gender: "", countryCode: "", email: "", password: "", acceptTerms: false, acceptPrivacy: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function update(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const age = calculateAge(form.dateOfBirth);
    if (age < 13) return setError("Hi!Book accounts are not available to anyone under 13.");
    if (age > 120) return setError("Please enter a valid date of birth.");
    if (!/^[A-Za-z]{2}$/.test(form.countryCode)) return setError("Enter your two-letter ISO country code, for example NG.");
    if (form.password.length < 8) return setError("Your password must contain at least 8 characters.");
    if (!form.acceptTerms || !form.acceptPrivacy) return setError("You must accept the Terms of Use and Privacy Policy to continue.");

    setLoading(true);
    const supabase = createClient();
    const countryCode = form.countryCode.toUpperCase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          middle_name: form.middleName.trim() || null,
          last_name: form.lastName.trim(),
          date_of_birth: form.dateOfBirth,
          gender: form.gender,
          country_code: countryCode,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "We could not create your account. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage("Account created. Check your email to verify your address, then continue with profile setup.");
      setLoading(false);
      return;
    }

    const { error: completionError } = await supabase.rpc("complete_registration");
    if (completionError) {
      setError(completionError.message);
      setLoading(false);
      return;
    }

    router.replace("/community");
    router.refresh();
  }

  const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
  const labelClass = "text-sm font-semibold text-slate-800";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">About you</p>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>First name</span>
            <input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Middle name <span className="font-normal text-slate-400">(optional)</span></span>
            <input value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className={inputClass} />
          </label>
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Last name</span>
        <input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClass} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Date of birth</span>
          <input required type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Country / region</span>
          <input required maxLength={2} placeholder="NG" value={form.countryCode} onChange={(e) => update("countryCode", e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">Use your two-letter ISO country code.</span>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Gender</span>
        <select required value={form.gender} onChange={(e) => update("gender", e.target.value)} className={`${inputClass} bg-slate-50`}>
          <option value="">Select one</option>
          {GENDERS.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}
        </select>
      </label>

      <div className="border-t border-slate-100 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Account details</p>
        <div className="mt-3 space-y-5">
          <label className="block">
            <span className={labelClass}>Email address</span>
            <input required type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Password</span>
            <input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className={inputClass} />
            <span className="mt-1.5 block text-xs leading-5 text-slate-400">At least 8 characters.</span>
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-sm font-semibold text-slate-800">Before you join</p>
        <label className="flex gap-3 text-sm leading-6 text-slate-600">
          <input required type="checkbox" checked={form.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>I accept the <Link href="/terms" className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">Terms of Use</Link>.</span>
        </label>
        <label className="flex gap-3 text-sm leading-6 text-slate-600">
          <input required type="checkbox" checked={form.acceptPrivacy} onChange={(e) => update("acceptPrivacy", e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>I accept the <Link href="/privacy" className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">Privacy Policy</Link>.</span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{message}</p>}

      <button type="submit" disabled={loading} className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        {loading ? "Creating account…" : "Create your Hi!Book account"}
      </button>

      <p className="text-center text-sm leading-6 text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950">Sign in</Link>
      </p>
    </form>
  );
}
