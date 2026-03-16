import test from "node:test";
import assert from "node:assert/strict";
import { decideFirstSessionRoute } from "../src/lib/firstSessionRoute.shared.js";

test("preserves non-default redirects", () => {
  assert.equal(
    decideFirstSessionRoute("/event/123", {
      friendCount: 0,
      rsvpCount: 0,
      inviteCount: 0,
    }),
    "/event/123"
  );
});

test("routes first-time users to friends before anything else", () => {
  assert.equal(
    decideFirstSessionRoute("/", {
      friendCount: 0,
      rsvpCount: 3,
      inviteCount: 2,
    }),
    "/friends?onboarding=1"
  );
});

test("routes users without RSVPs to explore after friends are set up", () => {
  assert.equal(
    decideFirstSessionRoute("/welcome", {
      friendCount: 2,
      rsvpCount: 0,
      inviteCount: 4,
    }),
    "/explore?onboarding=1"
  );
});

test("routes users without invites to profile after friends and RSVPs", () => {
  assert.equal(
    decideFirstSessionRoute("/intro", {
      friendCount: 2,
      rsvpCount: 1,
      inviteCount: 0,
    }),
    "/profile?onboarding=1"
  );
});

test("keeps the original redirect once activation milestones are complete", () => {
  assert.equal(
    decideFirstSessionRoute("/", {
      friendCount: 2,
      rsvpCount: 1,
      inviteCount: 3,
    }),
    "/"
  );
});
