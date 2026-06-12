import assert from "node:assert/strict";
import test from "node:test";

import { validateContactPayload } from "./validation.ts";

const now = 10_000;
const valid = {
  name: "Test User",
  email: "user@example.com",
  topic: "Business inquiry",
  message: "This is a sufficiently detailed inquiry message.",
  startedAt: 5_000,
};

test("accepts a valid contact inquiry", () => {
  assert.equal(validateContactPayload(valid, now).ok, true);
});

test("rejects honeypot and fast spam submissions", () => {
  assert.equal(validateContactPayload({ ...valid, company: "spam" }, now).ok, false);
  assert.equal(validateContactPayload({ ...valid, startedAt: 9_500 }, now).ok, false);
});

test("rejects invalid email and short messages", () => {
  assert.equal(validateContactPayload({ ...valid, email: "invalid" }, now).ok, false);
  assert.equal(validateContactPayload({ ...valid, message: "short" }, now).ok, false);
});
