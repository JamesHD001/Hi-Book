import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StorageEntry = {
  name: string;
  id: string | null;
  metadata?: Record<string, unknown> | null;
};

const BUCKETS = ["avatars", "posts", "messages"] as const;
const PAGE_SIZE = 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function removeUserFiles(
  admin: ReturnType<typeof createClient>,
  bucket: (typeof BUCKETS)[number],
  prefix: string,
): Promise<void> {
  while (true) {
    // Always fetch from offset zero because successfully removed objects shift
    // later entries forward. Offset pagination here could skip files permanently.
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Unable to list ${bucket}/${prefix}: ${error.message}`);
    const entries = (data ?? []) as StorageEntry[];
    if (entries.length === 0) return;

    const files: string[] = [];
    const folders: string[] = [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null || entry.metadata == null) {
        folders.push(entry.name);
      } else {
        files.push(path);
      }
    }

    if (files.length > 0) {
      const { error: removeError } = await admin.storage.from(bucket).remove(files);
      if (removeError) throw new Error(`Unable to remove ${bucket} files: ${removeError.message}`);
    }

    for (const folder of folders) {
      await removeUserFiles(admin, bucket, `${prefix}/${folder}`);
    }

    if (entries.length < PAGE_SIZE) {
      const { data: remaining, error: remainingError } = await admin.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });
      if (remainingError) throw new Error(`Unable to verify ${bucket}/${prefix}: ${remainingError.message}`);
      if (!remaining || remaining.length === 0) return;
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("ACCOUNT_LIFECYCLE_WORKER_SECRET");
  const authorization = request.headers.get("Authorization");
  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Worker environment is not configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: lifecycleError } = await admin.rpc("process_inactive_account_lifecycle");
  if (lifecycleError) {
    console.error("Inactive-account lifecycle processing failed", lifecycleError.message);
    return json({ error: "Lifecycle processing failed" }, 500);
  }

  const { data: expiredAccounts, error: queryError } = await admin
    .from("users")
    .select("id, deletion_recovery_deadline_at")
    .eq("lifecycle_state", "PENDING_DELETION")
    .lte("deletion_recovery_deadline_at", new Date().toISOString())
    .order("deletion_recovery_deadline_at", { ascending: true })
    .limit(100);

  if (queryError) {
    console.error("Unable to query expired accounts", queryError.message);
    return json({ error: "Unable to query expired accounts" }, 500);
  }

  const deleted: string[] = [];
  const failed: Array<{ userId: string; reason: string }> = [];

  for (const account of expiredAccounts ?? []) {
    const userId = account.id as string;
    try {
      for (const bucket of BUCKETS) {
        await removeUserFiles(admin, bucket, userId);
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error(deleteError.message);
      deleted.push(userId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown purge failure";
      console.error("Inactive-account purge failed", { userId, reason });
      failed.push({ userId, reason });
    }
  }

  return json({
    lifecycleProcessed: true,
    expiredAccountsFound: expiredAccounts?.length ?? 0,
    permanentlyDeleted: deleted.length,
    failed: failed.length,
    failures: failed.map(({ userId }) => ({ userId, reason: "Purge failed; eligible for retry" })),
  });
});
