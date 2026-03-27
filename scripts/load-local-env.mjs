import fs from "node:fs";
import path from "node:path";

function parseEnvFile(contents) {
  const entries = [];

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return entries;
}

export function loadLocalEnvFiles(...filenames) {
  for (const filename of filenames) {
    const fullPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(fullPath)) continue;

    const contents = fs.readFileSync(fullPath, "utf8");
    for (const [key, value] of parseEnvFile(contents)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
