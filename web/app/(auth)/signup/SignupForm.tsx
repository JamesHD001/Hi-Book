"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HBButton from "@/components/ui/HBButton";
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

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

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
      setError(
        "Enter your two-letter ISO country code, for example NG.",
      );
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (!form.acceptTerms || !form.acceptPrivacy) {
      setError(
        "You must accept the Terms of Use and Privacy Policy to continue.",
      );
      return;
    }

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
      setError(
        signUpError?.message ??
          "We could not create your account. Please try again.",
      );
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage(
        "Account created. Check your email to verify your address, then continue with profile setup.",
      );
      setLoading(false);
      return;
    }

    const { error: completionError } = await supabase.rpc(
      "complete_registration",
    );

    if (completionError) {
      setError(completionError.message);
      setLoading(false);
      return;
    }

    router.replace("/community");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="hb-auth-form">
      <fieldset className="hb-form-section">
        <legend className="hb-form-section__title">About you</legend>

        <div className="hb-form-section__body">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="hb-field">
              <span className="hb-label">First name</span>
              <HBInput
                required
                value={form.firstName}
                onChange={(event) =>
                  update("firstName", event.target.value)
                }
                autoComplete="given-name"
              />
            </label>

            <label className="hb-field">
              <span className="hb-label">
                Middle name{" "}
                <span className="font-normal text-[var(--muted)]">
                  (optional)
                </span>
              </span>
              <HBInput
                value={form.middleName}
                onChange={(event) =>
                  update("middleName", event.target.value)
                }
                autoComplete="additional-name"
              />
            </label>
          </div>

          <label className="hb-field">
            <span className="hb-label">Last name</span>
            <HBInput
              required
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              autoComplete="family-name"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="hb-field">
              <span className="hb-label">Date of birth</span>
              <HBInput
                required
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  update("dateOfBirth", event.target.value)
                }
                autoComplete="bday"
              />
            </label>

            <label className="hb-field">
              <span className="hb-label">Country / region</span>
              <HBInput
                required
                maxLength={2}
                placeholder="NG"
                value={form.countryCode}
                onChange={(event) =>
                  update("countryCode", event.target.value.toUpperCase())
                }
                className="uppercase"
                autoComplete="country"
              />
              <span className="hb-hint">
                Use your two-letter ISO country code.
              </span>
            </label>
          </div>

          <label className="hb-field">
            <span className="hb-label">Gender</span>
            <select
              required
              value={form.gender}
              onChange={(event) => update("gender", event.target.value)}
              className="hb-select"
              autoComplete="sex"
            >
              <option value="">Select one</option>
              {GENDERS.map((gender) => (
                <option key={gender.value} value={gender.value}>
                  {gender.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="hb-form-section">
        <legend className="hb-form-section__title">Account details</legend>

        <div className="hb-form-section__body">
          <label className="hb-field">
            <span className="hb-label">Email address</span>
            <HBInput
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>

          <label className="hb-field">
            <span className="hb-label">Password</span>
            <HBInput
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
            <span className="hb-hint">At least 8 characters.</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="hb-form-legal">
        <legend className="hb-label">Before you join</legend>

        <label>
          <input
            required
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(event) =>
              update("acceptTerms", event.target.checked)
            }
          />
          <span>
            I accept the{" "}
            <Link
              href="/terms"
              className="hb-form-link hb-form-link--strong"
            >
              Terms of Use
            </Link>
            .
          </span>
        </label>

        <label>
          <input
            required
            type="checkbox"
            checked={form.acceptPrivacy}
            onChange={(event) =>
              update("acceptPrivacy", event.target.checked)
            }
          />
          <span>
            I accept the{" "}
            <Link
              href="/privacy"
              className="hb-form-link hb-form-link--strong"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </fieldset>

      {error && (
        <p className="hb-status hb-status--error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="hb-status hb-status--success" role="status">
          {message}
        </p>
      )}

      <HBButton type="submit" disabled={loading} className="hb-button--block">
        {loading ? "Creating account…" : "Create your Hi!Book account"}
        {!loading && <span aria-hidden="true">→</span>}
      </HBButton>

      <p className="hb-auth-switch">
        Already have an account?{" "}
        <Link
          href="/login"
          className="hb-form-link hb-form-link--strong"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
