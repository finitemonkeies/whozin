export function deriveFirstSessionCounts(results) {
  const {
    friendIds,
    friendIdsError,
    attendeeCount,
    attendeeCountError,
    inviteCount,
    inviteCountError,
  } = results;

  if (friendIdsError || attendeeCountError || inviteCountError) {
    return null;
  }

  return {
    friendCount: Array.isArray(friendIds) ? friendIds.length : 0,
    rsvpCount: typeof attendeeCount === "number" ? attendeeCount : 0,
    inviteCount: typeof inviteCount === "number" ? inviteCount : 0,
  };
}
