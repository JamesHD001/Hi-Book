import ModerationQueue from "@/components/moderation/ModerationQueue";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ModerationCase = {
  case_id: string;
  case_number: string;
  target_type: "USER" | "POST" | "COMMENT" | "MESSAGE";
  target_id: string;
  source_type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_REVIEW" | "WAITING" | "ESCALATED" | "RESOLVED" | "CLOSED";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

export default async function ModerationPage() {
  await requireActiveUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_moderation_queue", {
    case_status_filter: null,
    priority_filter: null,
    page_limit: 50,
  });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-6">
          <p className="text-sm font-semibold text-[var(--foreground)]">Moderation access unavailable</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            You do not have permission to view the moderation queue, or the moderation service is temporarily unavailable.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary-dark)]">
          Safety & Moderation
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Moderation queue
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Review safety reports through server-authorized moderation cases. Reports are signals for human review, not automatic proof of wrongdoing.
        </p>
      </header>

      <ModerationQueue initialCases={(data ?? []) as ModerationCase[]} />
    </main>
  );
}
