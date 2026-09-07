import { notFound } from "next/navigation";
import ModerationCaseView from "@/components/moderation/ModerationCaseView";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ caseId: string }> };

export default async function ModerationCasePage({ params }: PageProps) {
  await requireActiveUser();
  const { caseId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_moderation_case_detail", {
    target_case_id: caseId,
  });

  if (error || !data?.[0]) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <ModerationCaseView initialCase={data[0]} />
    </main>
  );
}
