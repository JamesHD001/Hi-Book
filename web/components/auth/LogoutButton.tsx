"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button onClick={logout} className="hb-button hb-button--tertiary min-h-10 px-3 text-sm">
      Sign out
    </button>
  );
}
