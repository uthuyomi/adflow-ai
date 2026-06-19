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
const email = `phase5-e2e-${Date.now()}@example.com`;
const password = `Phase5-E2E-${Date.now()}-Aa1!`;
let userId = "";
let session: Record<string, unknown>;

test.beforeAll(async ({ request }) => {
  const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    data: { email, password, email_confirm: true },
  });
  expect(created.ok()).toBeTruthy();
  userId = (await created.json()).id;

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

test("protected workflow pages redirect unauthenticated users", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of ["/outcomes", "/codex-tasks", "/experiments", "/operations"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  }
  await context.close();
});

test("authenticated user can load outcomes dashboard from the real API", async ({ page }) => {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: `sb-${projectRef}-auth-token`, value: session },
  );
  await page.goto("/outcomes");
  await expect(page.getByRole("heading", { name: "Outcomes", exact: true })).toBeVisible();
  await expect(page.getByText("Learning records")).toBeVisible();
  await expect(page.getByText("No outcomes")).toBeVisible();
});
