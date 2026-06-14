import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function readEnv(file: string) {
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return values;
}

const backendEnv = readEnv(path.resolve(__dirname, "../backend/.env.local"));
const processEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "py -3.12 -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000",
      cwd: "..",
      env: { ...processEnv, ...backendEnv },
      port: 8000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
