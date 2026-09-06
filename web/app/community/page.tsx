import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: account } = await supabase
    .from("users")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!account || account.account_status !== "ACTIVE") redirect("/onboarding");

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div><span className="text-lg font-bold text-gray-950">Hi!Book</span><span className="ml-3 text-sm text-gray-500">Community</span></div>
          <LogoutButton />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Your community</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-950">Welcome, {profile?.display_name ?? "friend"}.</h1>
        <p className="mt-3 text-gray-600">Your authenticated application shell is ready. Social features will be connected next.</p>
        {profile?.username && <p className="mt-6 text-sm text-gray-500">@{profile.username}</p>}
      </section>
    </main>
  );
}
