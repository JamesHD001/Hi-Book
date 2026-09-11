import { request } from "@playwright/test";

async function createOrSignInTestUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!url || !key || !email || !password) {
    throw new Error("E2E requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, E2E_TEST_EMAIL, and E2E_TEST_PASSWORD.");
  }

  if (!url.startsWith("http://127.0.0.1:") && !url.startsWith("http://localhost:")) {
    throw new Error("E2E tests must use a local Supabase instance. Refusing to run against a non-local URL.");
  }

  const api = await request.newContext({ extraHTTPHeaders: { apikey: key } });
  const signup = await api.post(`${url}/auth/v1/signup`, {
    data: {
      email,
      password,
      data: {
        first_name: "E2E",
        middle_name: null,
        last_name: "Tester",
        date_of_birth: "1990-01-01",
        gender: "UNDISCLOSED",
        country_code: "NG",
      },
    },
  });

  let accessToken: string | undefined;
  if (signup.ok()) {
    const body = await signup.json();
    accessToken = body.access_token;
  } else if (signup.status() === 400) {
    const login = await api.post(`${url}/auth/v1/token?grant_type=password`, {
      data: { email, password },
    });
    if (!login.ok()) {
      throw new Error(`Could not authenticate E2E user: ${login.status()} ${await login.text()}`);
    }
    accessToken = (await login.json()).access_token;
  } else {
    throw new Error(`Could not create E2E user: ${signup.status()} ${await signup.text()}`);
  }

  if (!accessToken) {
    throw new Error("Supabase did not return an access token for the E2E user. Local auth must auto-confirm test accounts.");
  }

  const complete = await api.post(`${url}/rest/v1/rpc/complete_registration`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {},
  });

  if (!complete.ok()) {
    throw new Error(`Could not complete E2E registration: ${complete.status()} ${await complete.text()}`);
  }

  await api.dispose();
}

export default async function globalSetup() {
  await createOrSignInTestUser();
}
