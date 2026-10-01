import AppealForm from "@/components/moderation/AppealForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_active_moderation_actions", {
    target_user_id: user.id,
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary-dark)]">Safety</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Your moderation actions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          If you believe an active moderation action was applied incorrectly, you can submit one appeal for review.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-6 text-sm text-[var(--foreground)]">
          We could not load your active moderation actions right now.
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">No active moderation actions</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">There is nothing currently available to appeal.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(data as ActiveAction[]).map((action) => (
            <article key={action.action_id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">{action.action_type.replaceAll("_", " ")}</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Severity: {action.severity}</p>
                </div>
                {action.expires_at && (
                  <span className="rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--brand-primary-dark)]">
                    Expires {new Date(action.expires_at).toLocaleString()}
                  </span>
                )}
              </div>
              {action.reason && <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{action.reason}</p>}
              {action.appealable && <AppealForm actionId={action.action_id} />}
            </article>
          ))}
        </div>
      )}
    </div></main>
  );
}
