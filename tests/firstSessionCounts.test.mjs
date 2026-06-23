import test from "node:test";
import assert from "node:assert/strict";
import { deriveFirstSessionCounts } from "../src/lib/firstSessionCounts.shared.js";

test("derives first-session counts when all queries succeed", () => {
  assert.deepEqual(
    deriveFirstSessionCounts({
      friendIds: ["a", "b"],
      friendIdsError: null,
      attendeeCount: 3,
      attendeeCountError: null,
      inviteCount: 1,
      inviteCountError: null,
    }),
    {
      friendCount: 2,
      rsvpCount: 3,
      inviteCount: 1,
    }
  );
});

test("returns null when any onboarding count query fails", () => {
  assert.equal(
    deriveFirstSessionCounts({
      friendIds: ["a"],
      friendIdsError: null,
      attendeeCount: 0,
      attendeeCountError: { message: "attendees read failed" },
      inviteCount: 0,
      inviteCountError: null,
    }),
    null
  );
});
