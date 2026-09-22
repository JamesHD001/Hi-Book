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
    <main className="min-h-screen bg-[#f6f2ea] px-5 py-10 text-[#171717] sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center sm:min-h-[calc(100vh-7rem)]">
        <section className="w-full overflow-hidden rounded-[1.5rem] border border-[#d8d2c6] bg-[#fffdf8]">
          <div className="border-b border-[#d8d2c6] bg-[#171717] px-6 py-5 text-white sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black tracking-[-0.08em] text-[#171717]">
                  H!
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Hi!Book
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-white/90">
                    Account setup
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c85b45]">
                01 / 01
              </span>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c85b45]">
              One last step
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-[#171717] sm:text-4xl">
              Finish setting up your account
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#68645d]">
              Your email has been verified. The account still needs the current
              Terms of Use and Privacy Policy acceptance recorded before it can
              become active.
            </p>

            <div className="mt-7 rounded-2xl border border-[#d8d2c6] bg-[#f6f2ea] px-4 py-4 sm:px-5">
              <p className="text-sm font-medium text-[#171717]">
                Ready to join the community?
              </p>
              <p className="mt-1 text-sm leading-6 text-[#777168]">
                Accept the current terms to activate the account and continue
                to Hi!Book.
              </p>
            </div>

            <form action="/onboarding/complete" method="post" className="mt-7">
              <button
                type="submit"
                className="w-full rounded-xl bg-[#171717] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#c85b45] focus:ring-offset-2 focus:ring-offset-[#fffdf8]"
              >
                Accept and continue to Hi!Book
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
