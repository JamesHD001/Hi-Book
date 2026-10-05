import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FLOW_COOKIE = "hibook-oauth-flow";
const AUTH_PAGES = new Set(["login", "signup"]);

function clearFlowCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(FLOW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 0,
  });
}

type OAuthFlow = {
  provider: "google" | "apple";
  source: "login" | "signup";
  state: string;
  startedAt: string;
};

function failed(request: NextRequest, source: string, reason: string) {
  const page = AUTH_PAGES.has(source) ? source : "login";
  return NextResponse.redirect(new URL(`/${page}?auth_error=${reason}`, request.url));
}

function readFlow(value?: string): OAuthFlow | null {
  if (!value) return null;
  try {
    const flow = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OAuthFlow;
    if (
      (flow.provider !== "google" && flow.provider !== "apple") ||
      (flow.source !== "login" && flow.source !== "signup") ||
      typeof flow.state !== "string" ||
      !Number.isFinite(Date.parse(flow.startedAt))
    ) return null;
    return flow;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const providerError = params.get("error");
  const cookieStore = await cookies();
  const flow = readFlow(cookieStore.get(FLOW_COOKIE)?.value);
  const source = flow?.source ?? params.get("source") ?? "login";

  if (providerError) {
    clearFlowCookie(cookieStore);
    return failed(request, source, providerError === "access_denied" ? "cancelled" : "provider");
  }

  const requestedProvider = params.get("provider");
  const requestedState = params.get("state");
  if (requestedProvider || requestedState || flow) {
    if (
      !flow ||
      requestedProvider !== flow.provider ||
      requestedState !== flow.state ||
      Date.now() < Date.parse(flow.startedAt) ||
      Date.now() - Date.parse(flow.startedAt) > 10 * 60 * 1000
    ) {
      clearFlowCookie(cookieStore);
      return failed(request, source, "callback");
    }
  }

  if (!code) {
    clearFlowCookie(cookieStore);
    return failed(request, source, "expired");
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    clearFlowCookie(cookieStore);
    return failed(request, source, "session");
  }

  const exchange = await supabase.auth.exchangeCodeForSession(code).catch(() => null);
  if (!exchange || exchange.error || !exchange.data.user) {
    clearFlowCookie(cookieStore);
    return failed(request, source, "expired");
  }
  const { data } = exchange;

  if (flow) {
    const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
    if (identitiesError || !identitiesData) {
      await supabase.auth.signOut();
      clearFlowCookie(cookieStore);
      return failed(request, flow.source, "callback");
    }

    const startedAt = Date.parse(flow.startedAt);
    const providerIdentity = identitiesData.identities.find((identity) => identity.provider === flow.provider);
    if (!providerIdentity) {
      await supabase.auth.signOut();
      clearFlowCookie(cookieStore);
      return failed(request, flow.source, "callback");
    }
    const identityCreatedAt = Date.parse(providerIdentity.created_at ?? "");
    const newlyLinkedIdentity = !Number.isFinite(identityCreatedAt) || identityCreatedAt >= startedAt;

    const { data: account, error: accountError } = await supabase
      .from("users")
      .select("id, account_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (accountError) {
      await supabase.auth.signOut();
      clearFlowCookie(cookieStore);
      return failed(request, flow.source, "session");
    }

    if (account && newlyLinkedIdentity) {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(providerIdentity);
      await supabase.auth.signOut();
      clearFlowCookie(cookieStore);
      return failed(request, flow.source, unlinkError ? "linking" : "account_exists");
    }

    clearFlowCookie(cookieStore);
    if (!account) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL(account.account_status === "ACTIVE" ? "/community" : "/onboarding", request.url));
  }

  const next = params.get("next") || "/onboarding";
  const destination = new URL(next, request.url);
  if (destination.origin !== request.nextUrl.origin) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return NextResponse.redirect(destination);
}
