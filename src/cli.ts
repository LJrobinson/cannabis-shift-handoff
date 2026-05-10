import { readFileSync } from "node:fs";
import { parseShiftNotes } from "./parser";
import { toMarkdown } from "./markdown";

const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith("-"));
const outputJson = args.includes("--json");

if (!filePath) {
  console.error("Usage: npm run handoff -- <path-to-notes-file> [--json]");
  process.exit(1);
}

const input = readFileSync(filePath, "utf8");
const items = parseShiftNotes(input);

if (outputJson) {
  console.log(JSON.stringify(items, null, 2));
} else {
  console.log(toMarkdown(items));
}
