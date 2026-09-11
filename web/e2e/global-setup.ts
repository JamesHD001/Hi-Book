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

async function resetUserState(
  api: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  accessToken: string,
  userId: string,
  testUser: TestUser,
) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const operations = [
    api.delete(`${url}/rest/v1/follows?follower_id=eq.${userId}`, { headers }),
    api.delete(`${url}/rest/v1/follows?following_id=eq.${userId}`, { headers }),
    api.delete(`${url}/rest/v1/blocks?blocker_id=eq.${userId}`, { headers }),
    api.delete(`${url}/rest/v1/reports?reporter_id=eq.${userId}`, { headers }),
    api.delete(`${url}/rest/v1/posts?user_id=eq.${userId}`, { headers }),
    api.patch(`${url}/rest/v1/profiles?user_id=eq.${userId}`, {
      headers: { ...headers, Prefer: "return=minimal" },
      data: {
        display_name: `${testUser.firstName} ${testUser.lastName}`,
        bio: null,
      },
    }),
    api.patch(`${url}/rest/v1/user_privacy_settings?user_id=eq.${userId}`, {
      headers: { ...headers, Prefer: "return=minimal" },
      data: {
        profile_visibility: "PUBLIC",
        country_visibility: "PUBLIC",
        message_permission: "FOLLOWERS",
        discoverable: true,
      },
    }),
    api.patch(`${url}/rest/v1/discovery_preferences?user_id=eq.${userId}`, {
      headers: { ...headers, Prefer: "return=minimal" },
      data: { global_discovery_enabled: true },
    }),
  ];

  const results = await Promise.all(operations);
  const failed = results.find((result) => !result.ok() && result.status() !== 404);
  if (failed) {
    throw new Error(`Could not reset E2E state for ${testUser.email}: ${failed.status()} ${await failed.text()}`);
  }
}

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
  let userId: string | undefined;
  if (signup.ok()) {
    const body = await signup.json();
    accessToken = body.access_token;
    userId = body.user?.id;
  } else if (signup.status() === 400) {
    const login = await api.post(`${url}/auth/v1/token?grant_type=password`, {
      data: { email: testUser.email, password: testUser.password },
    });
    if (!login.ok()) {
      throw new Error(`Could not authenticate E2E user ${testUser.email}: ${login.status()} ${await login.text()}`);
    }
    const body = await login.json();
    accessToken = body.access_token;
    userId = body.user?.id;
  } else {
    throw new Error(`Could not create E2E user ${testUser.email}: ${signup.status()} ${await signup.text()}`);
  }

  if (!accessToken || !userId) {
    throw new Error(`Supabase did not return an authenticated user for ${testUser.email}.`);
  }

  const complete = await api.post(`${url}/rest/v1/rpc/complete_registration`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {},
  });
  if (!complete.ok()) {
    throw new Error(`Could not complete E2E registration for ${testUser.email}: ${complete.status()} ${await complete.text()}`);
  }

  await resetUserState(api, url, accessToken, userId, testUser);
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
