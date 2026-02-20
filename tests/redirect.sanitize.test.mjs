import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRedirectTarget } from "../src/lib/redirect.shared.js";

test("allows safe internal routes", () => {
  assert.equal(sanitizeRedirectTarget("/"), "/");
  assert.equal(sanitizeRedirectTarget("/event/123"), "/event/123");
  assert.equal(sanitizeRedirectTarget("/profile?tab=events"), "/profile?tab=events");
  assert.equal(sanitizeRedirectTarget("/web/landing"), "/web/landing");
});

test("rejects external, malformed, and setup-loop redirects", () => {
  assert.equal(sanitizeRedirectTarget("https://evil.com"), "/");
  assert.equal(sanitizeRedirectTarget(" https://evil.com "), "/");
  assert.equal(sanitizeRedirectTarget("//evil.com"), "/");
  assert.equal(sanitizeRedirectTarget("\\evil"), "/");
  assert.equal(sanitizeRedirectTarget("/setup"), "/");
  assert.equal(sanitizeRedirectTarget("/setup?redirect=/"), "/");
  assert.equal(sanitizeRedirectTarget("/foo\nbar"), "/");
  assert.equal(sanitizeRedirectTarget("/foo\rbar"), "/");
});

test("falls back to root for nullish or empty input", () => {
  assert.equal(sanitizeRedirectTarget(undefined), "/");
  assert.equal(sanitizeRedirectTarget(null), "/");
  assert.equal(sanitizeRedirectTarget(""), "/");
  assert.equal(sanitizeRedirectTarget("   "), "/");
});
