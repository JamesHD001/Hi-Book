import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Hi!Book</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">Finish setting up your account</h1>
        <p className="mt-3 leading-7 text-gray-600">
          Your email has been verified. The account still needs the current Terms of Use and Privacy Policy acceptance recorded before it can become active.
        </p>
        <form action="/onboarding/complete" method="post" className="mt-8">
          <button type="submit" className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
            Accept and continue to Hi!Book
          </button>
        </form>
      </section>
    </main>
  );
}
