import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const FLOW_COOKIE = "hibook-oauth-flow";
const PROVIDERS = new Set<Provider>(["google", "apple"]);

function clearFlowCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(FLOW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") as Provider | null;
  const source = request.nextUrl.searchParams.get("source") === "signup" ? "signup" : "login";
  const returnUrl = new URL(`/${source}?auth_error=provider`, request.url);

  if (!provider || !PROVIDERS.has(provider)) {
    return NextResponse.redirect(returnUrl);
  }

  const state = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const cookieStore = await cookies();
  cookieStore.set(
    FLOW_COOKIE,
    Buffer.from(JSON.stringify({ provider, source, state, startedAt })).toString("base64url"),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 600,
    },
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("provider", provider);
  callbackUrl.searchParams.set("source", source);
  callbackUrl.searchParams.set("state", state);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        ...(provider === "apple" ? { scopes: "name email" } : {}),
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });

    if (error || !data.url) {
      clearFlowCookie(cookieStore);
      return NextResponse.redirect(returnUrl);
    }

    return NextResponse.redirect(data.url);
  } catch {
    clearFlowCookie(cookieStore);
    return NextResponse.redirect(returnUrl);
  }
}