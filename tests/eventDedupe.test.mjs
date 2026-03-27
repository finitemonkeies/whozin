import test from "node:test";
import assert from "node:assert/strict";
import { dedupeInternalEventRows, dedupeUiEvents } from "../src/lib/eventDedupe.shared.js";

test("dedupeInternalEventRows collapses near-identical imported events and keeps the stronger row", () => {
  const rows = [
    {
      id: "import-1",
      title: "Sara Landry at The Midway",
      location: "The Midway",
      city: "San Francisco",
      event_date: "2026-04-10T21:00:00.000Z",
      event_end_date: null,
      image_url: null,
      description: null,
      event_source: "19hz",
      ticket_url: null,
    },
    {
      id: "internal-1",
      title: "Sara Landry",
      location: "Midway SF",
      city: "San Francisco",
      event_date: "2026-04-10T21:30:00.000Z",
      event_end_date: null,
      image_url: "https://example.com/poster.jpg",
      description: "Warehouse set",
      event_source: "internal",
      ticket_url: "https://example.com/tickets",
    },
  ];

  const deduped = dedupeInternalEventRows(rows);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, "internal-1");
  assert.equal(deduped[0].ticket_url, "https://example.com/tickets");
});

test("dedupeUiEvents merges fuzzy title matches from multiple explore collections", () => {
  const events = [
    {
      id: "a",
      title: "Charlotte de Witte",
      date: "Apr 12, 9:00 PM",
      eventDateIso: "2026-04-12T21:00:00.000Z",
      location: "1015 Folsom, San Francisco",
      image: "",
      attendees: 2,
      price: "RSVP",
      description: "",
      tags: ["Techno"],
      eventSource: "19hz",
      matchReason: "Bay Area picks while we lock your city",
    },
    {
      id: "b",
      title: "Charlotte de Witte - Live",
      date: "Apr 12, 9:30 PM",
      eventDateIso: "2026-04-12T21:30:00.000Z",
      location: "1015 Folsom",
      city: "San Francisco",
      image: "https://example.com/poster.jpg",
      attendees: 5,
      price: "RSVP",
      description: "Peak-time set",
      tags: ["Your Friends Are Going"],
      ticketUrl: "https://example.com/tickets",
      eventSource: "internal",
      matchReason: "2 friends are already going",
    },
  ];

  const deduped = dedupeUiEvents(events);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, "b");
  assert.equal(deduped[0].attendees, 5);
  assert.equal(deduped[0].matchReason, "2 friends are already going");
  assert.deepEqual(deduped[0].tags, ["Techno", "Your Friends Are Going"]);
});

test("dedupeUiEvents does not merge same-artist events at different venues", () => {
  const events = [
    {
      id: "night-1",
      title: "John Summit",
      date: "Apr 18, 8:00 PM",
      eventDateIso: "2026-04-18T20:00:00.000Z",
      location: "Bill Graham Civic, San Francisco",
      image: "",
      attendees: 0,
      price: "RSVP",
      description: "",
      tags: [],
      eventSource: "internal",
      matchReason: "",
    },
    {
      id: "night-2",
      title: "John Summit",
      date: "Apr 18, 10:00 PM",
      eventDateIso: "2026-04-18T22:00:00.000Z",
      location: "Public Works, San Francisco",
      image: "",
      attendees: 0,
      price: "RSVP",
      description: "",
      tags: [],
      eventSource: "internal",
      matchReason: "",
    },
  ];

  const deduped = dedupeUiEvents(events);
  assert.equal(deduped.length, 2);
});
