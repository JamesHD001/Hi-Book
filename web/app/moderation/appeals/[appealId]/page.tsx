import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppealReview from "@/components/moderation/AppealReview";

export const dynamic = "force-dynamic";

export default async function AppealReviewPage({ params }: { params: Promise<{ appealId: string }> }) {
  const { appealId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data, error } = await supabase.rpc("get_moderation_appeal", {
    target_appeal_id: appealId,
  });

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-red-700">Unable to load this appeal.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <AppealReview initialAppeal={data} />
    </main>
  );
}
