import AppealForm from "@/components/moderation/AppealForm";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ActiveAction = {
  action_id: string;
  action_type: string;
  reason: string | null;
  severity: string;
  starts_at: string;
  expires_at: string | null;
  appealable: boolean;
};

export default async function AppealsPage() {
  const { user } = await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_moderation_actions", {
    target_user_id: user.id,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Safety</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your moderation actions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          If you believe an active moderation action was applied incorrectly, you can submit one appeal for review.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          We could not load your active moderation actions right now.
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">No active moderation actions</h2>
          <p className="mt-2 text-sm text-slate-600">There is nothing currently available to appeal.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(data as ActiveAction[]).map((action) => (
            <article key={action.action_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{action.action_type.replaceAll("_", " ")}</h2>
                  <p className="mt-1 text-sm text-slate-500">Severity: {action.severity}</p>
                </div>
                {action.expires_at && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Expires {new Date(action.expires_at).toLocaleString()}
                  </span>
                )}
              </div>
              {action.reason && <p className="mt-4 text-sm leading-6 text-slate-700">{action.reason}</p>}
              {action.appealable && <AppealForm actionId={action.action_id} />}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
