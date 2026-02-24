type EventDateRange = {
  event_date?: string | null;
  event_end_date?: string | null;
};

function toTs(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return ts;
}

export function getEventStartTs(event: EventDateRange) {
  return toTs(event.event_date);
}

export function getEventEndTs(event: EventDateRange) {
  const endTs = toTs(event.event_end_date);
  if (endTs !== null) return endTs;
  return toTs(event.event_date);
}

export function isEventPast(event: EventDateRange, nowTs = Date.now()) {
  const endTs = getEventEndTs(event);
  return endTs !== null && endTs < nowTs;
}

export function isEventUpcomingOrOngoing(event: EventDateRange, nowTs = Date.now()) {
  return !isEventPast(event, nowTs);
}

export function formatEventDateTimeRange(event: EventDateRange) {
  const startTs = getEventStartTs(event);
  const endTs = getEventEndTs(event);

  if (startTs === null) return "Date TBD";

  const start = new Date(startTs);
  const startText = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (endTs === null || endTs === startTs) return startText;

  const end = new Date(endTs);
  const endText = end.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startText} - ${endText}`;
}
