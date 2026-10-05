"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Provider = "google" | "apple";
type AuthSource = "login" | "signup";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again whenever you’re ready.",
  expired: "That sign-in link expired. Start again to continue.",
  account_exists: "This email is already used by a Hi!Book account. Sign in with the method already connected to that account.",
  provider: "The provider could not complete sign-in. Please try again.",
  callback: "We could not finish sign-in. Start again to create a secure session.",
  session: "We could not restore your Hi!Book session. Please try signing in again.",
  linking: "We could not safely link this provider to your account. Contact support before trying again.",
};

function ProviderMark({ provider }: { provider: Provider }) {
  if (provider === "apple") {
    return (
      <svg className="auth-provider-button__mark auth-provider-button__mark--apple" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.37 12.52c.02 2.18 1.91 2.91 1.93 2.92-.02.05-.3 1.03-.99 2.04-.6.87-1.23 1.74-2.22 1.76-.97.02-1.28-.57-2.39-.57-1.11 0-1.46.55-2.38.59-.95.04-1.67-.94-2.27-1.81-1.23-1.78-2.17-5.02-.91-7.21.62-1.09 1.73-1.78 2.94-1.8.92-.02 1.79.63 2.36.63.57 0 1.64-.78 2.76-.67.47.02 1.79.19 2.64 1.43-.07.04-1.58.92-1.57 2.69ZM14.55 6.54c.5-.6.84-1.43.75-2.26-.72.03-1.59.48-2.11 1.07-.46.53-.87 1.38-.76 2.19.8.06 1.62-.4 2.12-1Z" />
      </svg>
    );
  }

  return (
    <svg className="auth-provider-button__mark auth-provider-button__mark--google" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.01v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.06v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.93a6 6 0 0 1 0-3.86v-2.6H3.06a10 10 0 0 0 0 9.06l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.78.51 3.82 1.52l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.47l3.35 2.6c.79-2.35 2.99-4.1 5.59-4.1Z" />
    </svg>
  );
}

export default function AuthProviderButtons({ source }: { source: AuthSource }) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<Provider | null>(null);
  const callbackError = searchParams.get("auth_error");

  function start(provider: Provider) {
    setLoading(provider);
    window.location.assign(`/auth/social/start?provider=${provider}&source=${source}`);
  }

  return (
    <div className="auth-provider-group" aria-busy={loading !== null}>
      {callbackError && (
        <p className="auth-provider-error" role="alert">
          {ERROR_MESSAGES[callbackError] ?? "We could not complete sign-in. Please try again."}
        </p>
      )}
      {(["google", "apple"] as const).map((provider) => {
        const providerName = provider === "google" ? "Google" : "Apple";
        const action = source === "signup" ? "Continue with" : "Login with";
        return (
          <button
            key={provider}
            type="button"
            className="auth-provider-button"
            onClick={() => start(provider)}
            disabled={loading !== null}
            aria-label={`${action} ${providerName}`}
          >
            <ProviderMark provider={provider} />
            <span>{loading === provider ? `Connecting to ${providerName}…` : `${action} ${providerName}`}</span>
          </button>
        );
      })}
    </div>
  );
}