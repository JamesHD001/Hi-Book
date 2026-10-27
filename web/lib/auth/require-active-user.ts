import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireActiveUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: account, error } = await supabase
    .from("users")
    .select("account_status, lifecycle_state, deletion_recovery_deadline_at")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !error &&
    (account?.lifecycle_state === "PAUSED" || account?.lifecycle_state === "PENDING_DELETION")
  ) {
    redirect("/account-recovery");
  }

  if (error || !account || account.account_status !== "ACTIVE") {
    redirect("/onboarding");
  }

  return { supabase, user };
}
