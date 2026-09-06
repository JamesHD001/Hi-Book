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
    <button onClick={logout} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
      Sign out
    </button>
  );
}
