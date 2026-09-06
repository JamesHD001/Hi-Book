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
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    countryCode: "",
    email: "",
    password: "",
    acceptTerms: false,
    acceptPrivacy: false,
  });
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
    if (age < 13) {
      setError("Hi!Book accounts are not available to anyone under 13.");
      return;
    }
    if (age > 120) {
      setError("Please enter a valid date of birth.");
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.countryCode)) {
      setError("Enter your two-letter ISO country code, for example NG.");
      return;
    }
    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (!form.acceptTerms || !form.acceptPrivacy) {
      setError("You must accept the Terms of Use and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const normalizedCountry = form.countryCode.toUpperCase();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          middle_name: form.middleName.trim() || null,
          last_name: form.lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("We could not create your account. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage("Account created. Check your email to verify your address, then continue with profile setup.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("users").insert({
      id: data.user.id,
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim() || null,
      last_name: form.lastName.trim(),
      date_of_birth: form.dateOfBirth,
      gender: form.gender,
      country_code: normalizedCountry,
      account_status: "ACTIVE",
    });

    if (profileError) {
      setError(`Your authentication account was created, but profile setup could not finish: ${profileError.message}`);
      setLoading(false);
      return;
    }

    router.replace("/community");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium">First name</span><input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>
        <label className="block"><span className="text-sm font-medium">Middle name <span className="font-normal text-gray-500">(optional)</span></span><input value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>
      </div>
      <label className="block"><span className="text-sm font-medium">Last name</span><input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium">Date of birth</span><input required type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>
        <label className="block"><span className="text-sm font-medium">Country code</span><input required maxLength={2} placeholder="NG" value={form.countryCode} onChange={(e) => update("countryCode", e.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 uppercase" /></label>
      </div>
      <label className="block"><span className="text-sm font-medium">Gender</span><select required value={form.gender} onChange={(e) => update("gender", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"><option value="">Select one</option>{GENDERS.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}</select></label>
      <label className="block"><span className="text-sm font-medium">Email</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>
      <label className="block"><span className="text-sm font-medium">Password</span><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" /><span className="mt-1 block text-xs text-gray-500">At least 8 characters.</span></label>

      <label className="flex gap-3 text-sm text-gray-700"><input required type="checkbox" checked={form.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)} className="mt-1" /><span>I accept the <Link href="/terms" className="font-semibold text-blue-600">Terms of Use</Link>.</span></label>
      <label className="flex gap-3 text-sm text-gray-700"><input required type="checkbox" checked={form.acceptPrivacy} onChange={(e) => update("acceptPrivacy", e.target.checked)} className="mt-1" /><span>I accept the <Link href="/privacy" className="font-semibold text-blue-600">Privacy Policy</Link>.</span></label>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}

      <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm text-gray-600">Already have an account? <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link></p>
    </form>
  );
}
