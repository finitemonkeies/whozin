const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "dj",
  "edition",
  "event",
  "for",
  "in",
  "live",
  "night",
  "official",
  "party",
  "presents",
  "presented",
  "show",
  "special",
  "the",
  "tour",
  "with",
]);

const LOCATION_STOP_WORDS = new Set([
  "bar",
  "center",
  "club",
  "hall",
  "lounge",
  "room",
  "stage",
  "the",
  "venue",
]);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bft\.?\b/g, " featuring ")
    .replace(/\bfeat\.?\b/g, " featuring ")
    .replace(/[(){}\[\],:/\\|+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function tokenize(value, stopWords) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1 || /^\d+$/.test(token))
    .filter((token) => !stopWords.has(token));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function overlapStats(aTokens, bTokens) {
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let overlap = 0;

  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }

  const smaller = Math.min(aSet.size, bSet.size) || 1;
  const union = new Set([...aSet, ...bSet]).size || 1;
  return {
    overlap,
    containment: overlap / smaller,
    jaccard: overlap / union,
  };
}

function parseStartTs(item) {
  const raw = item?.event_date ?? item?.eventDateIso ?? item?.date ?? null;
  const ts = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(ts) ? ts : Number.NaN;
}

function sameDateWindow(a, b) {
  const aTs = parseStartTs(a);
  const bTs = parseStartTs(b);
  if (!Number.isFinite(aTs) || !Number.isFinite(bTs)) return false;

  const diffMs = Math.abs(aTs - bTs);
  if (diffMs <= 6 * 60 * 60 * 1000) return true;

  const aDate = new Date(aTs);
  const bDate = new Date(bTs);
  return (
    aDate.getUTCFullYear() === bDate.getUTCFullYear() &&
    aDate.getUTCMonth() === bDate.getUTCMonth() &&
    aDate.getUTCDate() === bDate.getUTCDate()
  );
}

function titleSignals(item) {
  const title = item?.title ?? "";
  const normalized = normalizeText(title);
  const compact = compactText(title);
  const tokens = tokenize(title, TITLE_STOP_WORDS);
  return { normalized, compact, tokens };
}

function locationSignals(item) {
  const location = item?.location ?? "";
  const city = item?.city ?? "";
  const combined = `${location} ${city}`.trim();
  const normalized = normalizeText(combined);
  const compact = compactText(combined);
  const tokens = tokenize(combined, LOCATION_STOP_WORDS);
  return { normalized, compact, tokens, isMissing: combined.length === 0 };
}

function areTitlesSimilar(a, b) {
  const aTitle = titleSignals(a);
  const bTitle = titleSignals(b);
  if (!aTitle.normalized || !bTitle.normalized) return false;
  if (aTitle.normalized === bTitle.normalized) return true;
  if (aTitle.compact && aTitle.compact === bTitle.compact) return true;

  const stats = overlapStats(aTitle.tokens, bTitle.tokens);
  if (stats.overlap >= 3 && stats.containment >= 0.75) return true;
  if (stats.overlap >= 2 && stats.containment >= 0.9) return true;
  return stats.overlap >= 2 && stats.jaccard >= 0.67;
}

function areLocationsCompatible(a, b) {
  const aLocation = locationSignals(a);
  const bLocation = locationSignals(b);

  if (aLocation.isMissing && bLocation.isMissing) return false;
  if (aLocation.isMissing || bLocation.isMissing) return true;
  if (aLocation.normalized === bLocation.normalized) return true;
  if (aLocation.compact && aLocation.compact === bLocation.compact) return true;

  const stats = overlapStats(aLocation.tokens, bLocation.tokens);
  return stats.overlap >= 1 && stats.containment >= 0.6;
}

function sourcePriority(source) {
  const normalized = normalizeText(source);
  if (!normalized || normalized === "internal") return 4;
  if (normalized === "shotgun") return 2;
  if (normalized === "19hz") return 1;
  return 0;
}

function rowQualityScore(item) {
  return (
    sourcePriority(item?.event_source ?? item?.eventSource) * 10 +
    (item?.ticket_url || item?.ticketUrl ? 4 : 0) +
    (item?.image_url || item?.image ? 3 : 0) +
    (normalizeText(item?.description).length > 0 ? 2 : 0) +
    (normalizeText(item?.location).length > 0 ? 1 : 0)
  );
}

function choosePreferred(a, b) {
  return rowQualityScore(b) > rowQualityScore(a) ? b : a;
}

function shouldMerge(a, b) {
  if (!sameDateWindow(a, b)) return false;
  if (!areTitlesSimilar(a, b)) return false;

  const aLocation = locationSignals(a);
  const bLocation = locationSignals(b);
  if (!aLocation.isMissing && !bLocation.isMissing) {
    return areLocationsCompatible(a, b);
  }

  const stats = overlapStats(titleSignals(a).tokens, titleSignals(b).tokens);
  return stats.containment >= 0.9;
}

function dedupeWithMerge(items, merge) {
  /** @type {Array<any>} */
  const groups = [];

  for (const item of items) {
    let matchedIndex = -1;
    for (let index = 0; index < groups.length; index += 1) {
      if (shouldMerge(groups[index], item)) {
        matchedIndex = index;
        break;
      }
    }

    if (matchedIndex === -1) {
      groups.push(item);
      continue;
    }

    groups[matchedIndex] = merge(groups[matchedIndex], item);
  }

  return groups;
}

export function dedupeInternalEventRows(rows) {
  return dedupeWithMerge(rows, (current, incoming) => {
    const preferred = choosePreferred(current, incoming);
    const fallback = preferred === current ? incoming : current;

    return {
      ...fallback,
      ...preferred,
      image_url: preferred.image_url ?? fallback.image_url ?? null,
      ticket_url: preferred.ticket_url ?? fallback.ticket_url ?? null,
      description: preferred.description ?? fallback.description ?? null,
      location: preferred.location ?? fallback.location ?? null,
      city: preferred.city ?? fallback.city ?? null,
    };
  });
}

export function dedupeUiEvents(events) {
  return dedupeWithMerge(events, (current, incoming) => {
    const preferred = choosePreferred(current, incoming);
    const fallback = preferred === current ? incoming : current;

    const currentReason = normalizeText(current.matchReason);
    const incomingReason = normalizeText(incoming.matchReason);
    const matchReason =
      currentReason.includes("friend") && !incomingReason.includes("friend")
        ? current.matchReason
        : incomingReason.includes("friend") && !currentReason.includes("friend")
          ? incoming.matchReason
          : preferred.matchReason ?? fallback.matchReason;

    return {
      ...fallback,
      ...preferred,
      attendees: Math.max(current.attendees ?? 0, incoming.attendees ?? 0),
      description:
        (preferred.description ?? "").trim().length > 0 ? preferred.description : fallback.description,
      matchReason,
      ticketUrl: preferred.ticketUrl ?? fallback.ticketUrl,
      image: preferred.image ?? fallback.image,
      location: preferred.location ?? fallback.location,
      city: preferred.city ?? fallback.city,
      tags: unique([...(current.tags ?? []), ...(incoming.tags ?? [])]).slice(0, 4),
    };
  });
}
