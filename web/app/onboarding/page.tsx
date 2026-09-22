import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import HiBookLogo from "@/components/brand/HiBookLogo";
import HBButton from "@/components/ui/HBButton";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_status === "ACTIVE") redirect("/community");

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <div className="bg-[var(--brand-primary-dark)] px-6 py-6 text-white sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HiBookLogo className="h-10 w-10 text-white" compact aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Hi!Book</p>
                  <p className="mt-0.5 text-sm font-semibold text-white/90">Account setup</p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-accent)]">Final step</span>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary-dark)]">Email verified</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.06em] sm:text-4xl">Finish setting up your account.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
              Your email is verified. Accept the current Terms of Use and Privacy Policy to activate the account and enter the community.
            </p>

            <div className="mt-7 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--brand-primary-dark)]" aria-hidden="true" />
                <p className="text-sm font-bold">Your account stays in your control.</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                These acceptances are recorded against the current published versions of the two documents.
              </p>
            </div>

            {params.error && (
              <p role="alert" className="mt-5 rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-3 text-sm leading-6 text-[var(--error)]">
                {params.error}
              </p>
            )}

            <form action="/onboarding/complete" method="post" className="mt-7">
              <HBButton type="submit" className="w-full">
                Accept and continue to Hi!Book
              </HBButton>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
