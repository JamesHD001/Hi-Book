import { request } from "@playwright/test";

type TestUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

const users: TestUser[] = [
  {
    email: process.env.E2E_TEST_EMAIL ?? "e2e-test@hibook.test",
    password: process.env.E2E_TEST_PASSWORD ?? "E2eTestPassword123!",
    firstName: "E2E User A",
    lastName: "Tester",
  },
  {
    email: process.env.E2E_TEST_EMAIL_B ?? "e2e-test-b@hibook.test",
    password: process.env.E2E_TEST_PASSWORD_B ?? "E2eTestPassword123!",
    firstName: "E2E User B",
    lastName: "Tester",
  },
];

async function createOrSignInTestUser(api: Awaited<ReturnType<typeof request.newContext>>, testUser: TestUser) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const signup = await api.post(`${url}/auth/v1/signup`, {
    data: {
      email: testUser.email,
      password: testUser.password,
      data: {
        first_name: testUser.firstName,
        middle_name: null,
        last_name: testUser.lastName,
        date_of_birth: "1990-01-01",
        gender: "UNDISCLOSED",
        country_code: "NG",
      },
    },
  });

  let accessToken: string | undefined;
  if (signup.ok()) {
    accessToken = (await signup.json()).access_token;
  } else if (signup.status() === 400) {
    const login = await api.post(`${url}/auth/v1/token?grant_type=password`, {
      data: { email: testUser.email, password: testUser.password },
    });
    if (!login.ok()) {
      throw new Error(`Could not authenticate E2E user ${testUser.email}: ${login.status()} ${await login.text()}`);
    }
    accessToken = (await login.json()).access_token;
  } else {
    throw new Error(`Could not create E2E user ${testUser.email}: ${signup.status()} ${await signup.text()}`);
  }

  if (!accessToken) {
    throw new Error(`Supabase did not return an access token for ${testUser.email}. Local auth must auto-confirm test accounts.`);
  }

  const complete = await api.post(`${url}/rest/v1/rpc/complete_registration`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {},
  });
  if (!complete.ok()) {
    throw new Error(`Could not complete E2E registration for ${testUser.email}: ${complete.status()} ${await complete.text()}`);
  }
}

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("E2E requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  if (!url.startsWith("http://127.0.0.1:") && !url.startsWith("http://localhost:")) {
    throw new Error("E2E tests must use a local Supabase instance. Refusing to run against a non-local URL.");
  }

  const api = await request.newContext({ extraHTTPHeaders: { apikey: key } });
  try {
    for (const user of users) await createOrSignInTestUser(api, user);
  } finally {
    await api.dispose();
  }
}
