import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ModerationAppealsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data, error } = await supabase.rpc("get_moderation_appeal_queue", {
    page_limit: 50,
  });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/moderation" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to moderation</Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load appeals.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/moderation" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to moderation</Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Appeal review</h1>
          <p className="mt-1 text-sm text-slate-600">Review submitted appeals separately from the original moderation queue.</p>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {(data ?? []).length === 0 ? (
          <div className="p-8 text-sm text-slate-500">There are no pending appeals.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {(data ?? []).map((appeal: any) => (
              <Link key={appeal.appeal_id} href={`/moderation/appeals/${appeal.appeal_id}`} className="block p-5 hover:bg-slate-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-500">{appeal.case_number ?? appeal.appeal_id}</p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950">{String(appeal.status).replaceAll("_", " ")}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{appeal.reason}</p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{String(appeal.target_type ?? "CASE").replaceAll("_", " ")}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{new Date(appeal.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
