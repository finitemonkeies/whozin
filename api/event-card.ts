type VercelRequest = {
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

function getSingle(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function trimTo(value: string, max: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function splitTitleLines(value: string, maxLines: number, maxCharsPerLine: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let index = 0;

  while (index < words.length && lines.length < maxLines) {
    const word = words[index];
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      index += 1;
      continue;
    }

    if (!current) {
      lines.push(trimTo(word, maxCharsPerLine));
      index += 1;
      continue;
    }

    lines.push(current);
    current = "";
  }

  if (current && lines.length < maxLines) {
    const remaining = [current, ...words.slice(index)].join(" ").trim();
    lines.push(trimTo(remaining, maxCharsPerLine));
  } else if (index < words.length && lines.length > 0) {
    lines[lines.length - 1] = trimTo(
      `${lines[lines.length - 1]} ${words.slice(index).join(" ")}`.trim(),
      maxCharsPerLine
    );
  }

  return lines.slice(0, maxLines);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const mode = getSingle(req.query.mode).trim().toLowerCase();
  const title = trimTo(getSingle(req.query.title) || "The move is forming", 72);
  const date = trimTo(getSingle(req.query.date) || "Date TBA", 36);
  const location = trimTo(getSingle(req.query.location) || "Location TBA", 40);
  const inviter = trimTo(getSingle(req.query.inviter) || "Your friend", 28);
  const titleLines = splitTitleLines(title, mode === "invite" ? 2 : 3, mode === "invite" ? 22 : 24);
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="100" y="${mode === "invite" ? 262 + index * 72 : 220 + index * 74}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${mode === "invite" ? "60" : "64"}" font-weight="800">${escapeXml(line)}</text>`
    )
    .join("\n  ");
  const inviteTop = mode === "invite"
    ? `
  <g transform="translate(100 98)">
    <rect width="276" height="50" rx="25" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.14)"/>
    <text x="22" y="31" fill="#FDE7F3" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${escapeXml(inviter)} wants you there</text>
  </g>
  <text x="100" y="182" fill="rgba(244,244,245,0.78)" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600">Open the link and see who is already in.</text>`
    : "";
  const inviteBottom = mode === "invite"
    ? `
  <g transform="translate(100 462)">
    <rect width="520" height="84" rx="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.14)"/>
    <text x="24" y="34" fill="rgba(249,168,212,0.95)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2">WHY TAP</text>
    <text x="24" y="63" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">RSVP fast. Bring your people. Decide faster.</text>
  </g>`
    : "";
  const inviteBadge = mode === "invite"
    ? `
  <g transform="translate(930 96)">
    <rect width="160" height="160" rx="40" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)"/>
    <text x="80" y="76" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800">WZ</text>
    <text x="80" y="108" text-anchor="middle" fill="rgba(244,244,245,0.74)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2">JOIN THE</text>
    <text x="80" y="132" text-anchor="middle" fill="rgba(244,244,245,0.95)" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" letter-spacing="2">MOVE</text>
  </g>`
    : `
  <g transform="translate(905 112)">
    <rect width="180" height="180" rx="36" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)"/>
    <text x="90" y="88" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800">WZ</text>
    <text x="90" y="122" text-anchor="middle" fill="rgba(244,244,245,0.65)" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="2">THE MOVE</text>
  </g>`;
  const footer = mode === "invite"
    ? `<text x="100" y="586" fill="rgba(244,244,245,0.78)" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600">Private by default. Optimized for the friend who might actually say yes.</text>`
    : `<text x="100" y="560" fill="rgba(244,244,245,0.7)" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600">See who is going before you go.</text>`;

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#08080A"/>
      <stop offset="0.55" stop-color="#271238"/>
      <stop offset="1" stop-color="#0B1222"/>
    </linearGradient>
    <radialGradient id="pinkGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(248 158) rotate(34.8) scale(402 301)">
      <stop stop-color="#EC4899" stop-opacity="0.65"/>
      <stop offset="1" stop-color="#EC4899" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blueGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1030 134) rotate(150.2) scale(360 280)">
      <stop stop-color="#60A5FA" stop-opacity="0.52"/>
      <stop offset="1" stop-color="#60A5FA" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#pinkGlow)"/>
  <rect width="1200" height="630" fill="url(#blueGlow)"/>
  <g opacity="0.18">
    <path d="M0 510H1200" stroke="white" stroke-width="1"/>
    <path d="M0 558H1200" stroke="white" stroke-width="1"/>
    <path d="M0 606H1200" stroke="white" stroke-width="1"/>
    <path d="M960 0V630" stroke="white" stroke-width="1"/>
    <path d="M1012 0V630" stroke="white" stroke-width="1"/>
    <path d="M1064 0V630" stroke="white" stroke-width="1"/>
  </g>
  <rect x="58" y="58" width="1084" height="514" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/>
  <text x="100" y="122" fill="#F9A8D4" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="5">${mode === "invite" ? "WHOZIN INVITE" : "WHOZIN EVENT"}</text>
  ${inviteTop}
  ${titleSvg}
  <g transform="translate(98 ${mode === "invite" ? "354" : "448"})">
    <rect width="270" height="78" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)"/>
    <text x="24" y="30" fill="rgba(244,244,245,0.55)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2.4">DATE</text>
    <text x="24" y="58" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(date)}</text>
  </g>
  <g transform="translate(390 ${mode === "invite" ? "354" : "448"})">
    <rect width="420" height="78" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)"/>
    <text x="24" y="30" fill="rgba(244,244,245,0.55)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2.4">LOCATION</text>
    <text x="24" y="58" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(location)}</text>
  </g>
  ${inviteBottom}
  ${inviteBadge}
  ${footer}
</svg>`.trim();

  res.status(200);
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(svg);
}
