export type MoveStatus =
  | "the_move"
  | "might_be_the_move"
  | "building_fast"
  | "your_friends_are_going"
  | "trending_with_your_circle";

export type MoveScope = "city" | "circle" | "event";

export type MoveCandidate = {
  id: string;
  title: string;
  startAt?: string | null;
  totalRsvps: number;
  friendRsvps?: number;
  friendOfFriendRsvps?: number;
  recentRsvps?: number;
  saves?: number;
  views?: number;
  quality?: number;
};

export type MoveSignal = {
  eventId: string;
  score: number;
  status: MoveStatus;
  label: string;
  secondary: string;
  explainer: string;
  debug: {
    totalScore: number;
    friendScore: number;
    friendOfFriendScore: number;
    velocityScore: number;
    saveScore: number;
    viewScore: number;
    timeScore: number;
    qualityPenalty: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getHoursUntilStart(startAt?: string | null, nowTs = Date.now()) {
  if (!startAt) return null;
  const ts = new Date(startAt).getTime();
  if (Number.isNaN(ts)) return null;
  return (ts - nowTs) / (1000 * 60 * 60);
}

function getTimeScore(startAt?: string | null, nowTs = Date.now()) {
  const hoursUntilStart = getHoursUntilStart(startAt, nowTs);
  if (hoursUntilStart === null) return 6;
  if (hoursUntilStart < -6) return -10;
  if (hoursUntilStart <= 2) return 18;
  if (hoursUntilStart <= 8) return 16;
  if (hoursUntilStart <= 24) return 12;
  if (hoursUntilStart <= 48) return 8;
  if (hoursUntilStart <= 72) return 4;
  if (hoursUntilStart <= 168) return 0;
  return -18;
}

function isWithinMoveWindow(startAt?: string | null, nowTs = Date.now()) {
  const hoursUntilStart = getHoursUntilStart(startAt, nowTs);
  if (hoursUntilStart === null) return true;
  return hoursUntilStart >= -6 && hoursUntilStart <= 168;
}

export function computeMoveScore(candidate: MoveCandidate, nowTs = Date.now()) {
  const totalRsvps = Math.max(0, candidate.totalRsvps);
  const friendRsvps = Math.max(0, candidate.friendRsvps ?? 0);
  const friendOfFriendRsvps = Math.max(0, candidate.friendOfFriendRsvps ?? 0);
  const recentRsvps = Math.max(0, candidate.recentRsvps ?? 0);
  const saves = Math.max(0, candidate.saves ?? 0);
  const views = Math.max(0, candidate.views ?? 0);
  const quality = clamp(candidate.quality ?? 1, 0, 1);

  const totalScore = Math.log1p(totalRsvps) * 14;
  const friendScore = friendRsvps * 18;
  const friendOfFriendScore = friendOfFriendRsvps * 8;
  const velocityScore = recentRsvps * 11;
  const saveScore = Math.log1p(saves) * 4;
  const viewScore = Math.log1p(views) * 2;
  const timeScore = getTimeScore(candidate.startAt, nowTs);
  const lowSignalPenalty =
    totalRsvps < 5 && friendRsvps === 0 && recentRsvps < 2 ? 14 : 0;
  const qualityPenalty = (1 - quality) * 20 + lowSignalPenalty;

  return {
    score: round(
      totalScore +
        friendScore +
        friendOfFriendScore +
        velocityScore +
        saveScore +
        viewScore +
        timeScore -
        qualityPenalty
    ),
    debug: {
      totalScore: round(totalScore),
      friendScore: round(friendScore),
      friendOfFriendScore: round(friendOfFriendScore),
      velocityScore: round(velocityScore),
      saveScore: round(saveScore),
      viewScore: round(viewScore),
      timeScore: round(timeScore),
      qualityPenalty: round(qualityPenalty),
    },
  };
}

function qualifiesForTheMove(candidate: MoveCandidate, score: number, nowTs = Date.now()) {
  const socialProof =
    candidate.totalRsvps >= 12 ||
    (candidate.friendRsvps ?? 0) >= 2 ||
    (candidate.recentRsvps ?? 0) >= 4;
  const inWindow = isWithinMoveWindow(candidate.startAt, nowTs);
  return socialProof && inWindow && score >= 34;
}

function describeSignal(status: MoveStatus, candidate: MoveCandidate) {
  const friendRsvps = Math.max(0, candidate.friendRsvps ?? 0);
  const recentRsvps = Math.max(0, candidate.recentRsvps ?? 0);
  const totalRsvps = Math.max(0, candidate.totalRsvps);

  switch (status) {
    case "the_move":
      return {
        label: "The Move",
        secondary:
          friendRsvps > 0
            ? `${formatCount(friendRsvps, "friend")} in`
            : `${formatCount(totalRsvps, "person", "people")} going`,
        explainer: "This is where the night is building fastest.",
      };
    case "trending_with_your_circle":
      return {
        label: "Trending With Your Circle",
        secondary: `${formatCount(friendRsvps, "friend")} going`,
        explainer: "Your people are stacking here early.",
      };
    case "your_friends_are_going":
      return {
        label: "Your Friends Are Going",
        secondary: `${formatCount(friendRsvps, "friend")} locked in`,
        explainer: "Easy night. Your crew is already moving toward this one.",
      };
    case "building_fast":
      return {
        label: "Building Fast",
        secondary: `${formatCount(recentRsvps, "new RSVP")} lately`,
        explainer: "Momentum is climbing right now.",
      };
    case "might_be_the_move":
      return {
        label: "Might Be The Move",
        secondary:
          totalRsvps > 0
            ? `${formatCount(totalRsvps, "person", "people")} already going`
            : "Momentum is starting to show",
        explainer: "Not fully there yet, but the energy is real.",
      };
  }
}

export function rankMoveCandidates(
  candidates: MoveCandidate[],
  scope: MoveScope,
  nowTs = Date.now()
) {
  const scored = candidates
    .map((candidate) => {
      const computed = computeMoveScore(candidate, nowTs);
      return {
        candidate,
        score: computed.score,
        debug: computed.debug,
        qualifies: qualifiesForTheMove(candidate, computed.score, nowTs),
      };
    })
    .sort((a, b) => b.score - a.score);

  const topQualified = scored.find((entry) => entry.qualifies) ?? null;
  const signalsById: Record<string, MoveSignal> = {};

  for (const entry of scored) {
    const friendRsvps = Math.max(0, entry.candidate.friendRsvps ?? 0);
    const recentRsvps = Math.max(0, entry.candidate.recentRsvps ?? 0);
    const inWindow = isWithinMoveWindow(entry.candidate.startAt, nowTs);
    let status: MoveStatus | null = null;

    if (topQualified && topQualified.candidate.id === entry.candidate.id) {
      status = "the_move";
    } else if (scope !== "city" && friendRsvps >= 3) {
      status = "trending_with_your_circle";
    } else if (scope !== "city" && friendRsvps >= 1) {
      status = "your_friends_are_going";
    } else if (inWindow && recentRsvps >= 3 && entry.score >= 28) {
      status = "building_fast";
    } else if (inWindow && entry.qualifies) {
      status = "might_be_the_move";
    }

    if (!status) continue;

    const described = describeSignal(status, entry.candidate);
    signalsById[entry.candidate.id] = {
      eventId: entry.candidate.id,
      score: entry.score,
      status,
      label: described.label,
      secondary: described.secondary,
      explainer: described.explainer,
      debug: entry.debug,
    };
  }

  return {
    ranked: scored,
    signalsById,
    topSignal: topQualified ? signalsById[topQualified.candidate.id] ?? null : null,
  };
}
