import { expect, test } from "@playwright/test";

test("landing page matches the ad optimization workspace positioning in English and Japanese", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await expect(page.getByRole("heading", { name: /Improvement Doesn't Stop Because Of Ads\./ })).toBeVisible();
  await expect(page.getByText("AD OPTIMIZATION WORKSPACE")).toBeVisible();
  await expect(page.getByText("Ad-LP Pair Analysis Dashboard")).toBeVisible();
  await expect(page.getByText("Open Improvements")).toBeVisible();
  await expect(page.getByRole("heading", { name: /You're Making Improvements\./ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Turn Improvements Into A Repeatable System" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Optimization Never Ends" })).toBeVisible();
  await expect(page.getByText("Past improvements become reusable knowledge")).toBeVisible();
  await expect(page.getByText("For teams running continuous optimization")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose The Plan That Fits Your Workflow" })).toBeVisible();
  await expect(page.getByText("Weekly Build Decision")).toHaveCount(0);
  await expect(page.getByText("PIVOT")).toHaveCount(0);

  await page.getByRole("button", { name: "日本語", exact: true }).click();

  await expect(page.getByRole("heading", { name: /改善が止まる理由は広告ではありません。/ })).toBeVisible();
  await expect(page.getByText("広告改善ワークスペース")).toBeVisible();
  await expect(page.getByText("広告・LPペア分析ダッシュボード")).toBeVisible();
  await expect(page.getByRole("heading", { name: /改善はしています。/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最適化は終わりません" })).toBeVisible();
});
