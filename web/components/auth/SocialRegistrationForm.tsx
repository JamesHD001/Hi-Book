"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HBInput from "@/components/ui/HBInput";

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

export default function SocialRegistrationForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: initialFirstName,
    middleName: "",
    lastName: initialLastName,
    dateOfBirth: "",
    gender: "",
    countryCode: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const age = calculateAge(form.dateOfBirth);
    if (age < 13) return setError("Hi!Book accounts are not available to anyone under 13.");
    if (age > 120) return setError("Please enter a valid date of birth.");
    if (!/^[A-Za-z]{2}$/.test(form.countryCode)) return setError("Enter your two-letter ISO country code, for example NG.");
    if (!form.gender) return setError("Select a gender option to continue.");
    if (!form.acceptTerms || !form.acceptPrivacy) return setError("You must accept the Terms of Use and Privacy Policy to continue.");

    setLoading(true);
    const supabase = createClient();
    const { data, error: completionError } = await supabase.rpc("complete_social_registration", {
      p_first_name: form.firstName.trim(),
      p_middle_name: form.middleName.trim() || null,
      p_last_name: form.lastName.trim(),
      p_date_of_birth: form.dateOfBirth,
      p_gender: form.gender,
      p_country_code: form.countryCode.toUpperCase(),
      p_accept_terms: form.acceptTerms,
      p_accept_privacy: form.acceptPrivacy,
    });

    if (completionError || data !== true) {
      setError("We could not finish setting up your account. Check your details and try again.");
      setLoading(false);
      return;
    }

    router.replace("/community");
    router.refresh();
  }

  const inputClass = "mt-2 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[var(--foreground)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10";
  const labelClass = "text-sm font-semibold text-[var(--foreground)]";

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>First name</span>
          <HBInput required maxLength={50} autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Middle name <span className="font-normal text-(--muted)">(optional)</span></span>
          <HBInput maxLength={50} autoComplete="additional-name" value={form.middleName} onChange={(event) => update("middleName", event.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Last name</span>
        <HBInput required maxLength={50} autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} className={inputClass} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Date of birth</span>
          <input required type="date" autoComplete="bday" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Country / region</span>
          <input required maxLength={2} autoComplete="country" placeholder="NG" value={form.countryCode} onChange={(event) => update("countryCode", event.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
          <span className="mt-1.5 block text-xs leading-5 text-(--muted)">Use your two-letter ISO country code.</span>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Gender</span>
        <select required value={form.gender} onChange={(event) => update("gender", event.target.value)} className={`${inputClass} bg-(--surface-secondary)`}>
          <option value="">Select one</option>
          {GENDERS.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}
        </select>
      </label>

      <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface-secondary)/70 p-4">
        <p className="text-sm font-semibold text-(--foreground)">Before you join</p>
        <label className="flex gap-3 text-sm leading-6 text-(--text-secondary)">
          <input required type="checkbox" checked={form.acceptTerms} onChange={(event) => update("acceptTerms", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>I accept the <Link href="/terms" className="font-semibold text-(--foreground) underline underline-offset-4">Terms of Use</Link>.</span>
        </label>
        <label className="flex gap-3 text-sm leading-6 text-(--text-secondary)">
          <input required type="checkbox" checked={form.acceptPrivacy} onChange={(event) => update("acceptPrivacy", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>I accept the <Link href="/privacy" className="font-semibold text-(--foreground) underline underline-offset-4">Privacy Policy</Link>.</span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-(--error)/20 bg-(--error)/10 px-4 py-3 text-sm leading-6 text-(--error)">{error}</p>}

      <button type="submit" disabled={loading} className="w-full rounded-2xl bg-(--brand-primary) px-5 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-(--brand-primary-dark) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        {loading ? "Finishing account setup…" : "Accept and join Hi!Book"}
      </button>
    </form>
  );
}