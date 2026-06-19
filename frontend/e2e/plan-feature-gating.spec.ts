import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function readEnv(file: string) {
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return values;
}

const frontendEnv = readEnv(path.resolve(__dirname, "../.env.local"));
const supabaseUrl = frontendEnv.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = frontendEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = frontendEnv.SUPABASE_SERVICE_ROLE_KEY;
const email = `plan-gate-e2e-${Date.now()}@example.com`;
const password = `Plan-Gate-${Date.now()}-Aa1!`;
let userId = "";
let session: Record<string, unknown>;

test.beforeAll(async ({ request }) => {
  const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    data: { email, password, email_confirm: true },
  });
  expect(created.ok()).toBeTruthy();
  userId = (await created.json()).id;

  for (let index = 0; index < 10; index += 1) {
    const project = await request.post(`${supabaseUrl}/rest/v1/ad_projects`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
      data: { user_id: userId, name: `Saved item ${index + 1}`, status: "ACTIVE" },
    });
    expect(project.ok()).toBeTruthy();
  }

  const signedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey },
    data: { email, password },
  });
  expect(signedIn.ok()).toBeTruthy();
  session = await signedIn.json();
});

test.afterAll(async ({ request }) => {
  if (!userId) return;
  await request.delete(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
});

test("free saved-item limit shows an upgrade action", async ({ page }) => {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: `sb-${projectRef}-auth-token`, value: session },
  );
  await page.goto("/projects");
  await page.getByPlaceholder("Project name").fill("Blocked project");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText("Free plan supports up to 10 saved items.")).toBeVisible();
  await expect(page.getByRole("button", { name: "View pricing" })).toBeVisible();
});
