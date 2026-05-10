import { readFileSync } from "node:fs";
import { parseShiftNotes } from "./parser";
import { toMarkdown } from "./markdown";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: npm run handoff -- <path-to-notes-file>");
  process.exit(1);
}

const input = readFileSync(filePath, "utf8");
const items = parseShiftNotes(input);
const markdown = toMarkdown(items);

console.log(markdown);