import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.findIndex((arg) => arg === `--${name}`);
  return idx >= 0 ? args[idx + 1] ?? fallback : fallback;
};

const dryRun = !args.includes("--live");
const email = getArg("email", null);
const city = getArg("city", null);
const editorNote = getArg("editor-note", null);
const editorNoteFile = getArg("editor-note-file", "reports/weekly_digest_editor_note.txt");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

for (const candidate of [".env.ops", ".env.local", ".env"]) {
  loadEnvFile(path.resolve(process.cwd(), candidate));
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

let resolvedEditorNote = editorNote;
if (!resolvedEditorNote && editorNoteFile) {
  const notePath = path.resolve(process.cwd(), editorNoteFile);
  if (fs.existsSync(notePath)) {
    const raw = fs.readFileSync(notePath, "utf8").trim();
    if (raw && !raw.startsWith("#")) {
      resolvedEditorNote = raw;
    }
  }
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId = null;
if (email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Could not load profile:", error.message);
    process.exit(1);
  }
  if (!data?.id) {
    console.error(`No profile found for ${email}.`);
    process.exit(1);
  }
  userId = data.id;
}

const response = await fetch(`${url.replace(/\/+$/, "")}/functions/v1/email-retention-send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    trigger_key: "weekly_moves_digest",
    dry_run: dryRun,
    user_id: userId,
    city,
    editor_note: resolvedEditorNote,
  }),
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  console.error("Weekly digest preview failed:", payload ?? { status: response.status });
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
