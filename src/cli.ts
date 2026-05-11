import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseShiftNotes } from "./parser";
import { toMarkdown } from "./markdown";
import {
  createMobyRunManifest,
  HANDOFF_JSON_FILE_NAME,
  HANDOFF_MARKDOWN_FILE_NAME,
  MOBY_RUN_MANIFEST_FILE_NAME,
  type HandoffOutputFormat,
} from "./moby-run-manifest";
import type { HandoffItem } from "./categories";

type CliArgs = {
  filePath: string;
  outputJson: boolean;
  runDir?: string;
  runId?: string;
};

const args = parseArgs(process.argv.slice(2));

if (!args) {
  console.error(
    "Usage: npm run handoff -- <path-to-notes-file> [--json] [--run-dir <dir>] [--run-id <id>]",
  );
  process.exit(1);
}

const input = readFileSync(args.filePath, "utf8");
const items = parseShiftNotes(input);
const outputFormat = args.outputJson ? "json" : "markdown";
const output = args.outputJson
  ? JSON.stringify(items, null, 2)
  : toMarkdown(items);

if (args.runDir) {
  writeRunOutputs(args, input, items, output, outputFormat);
}

console.log(output);

function parseArgs(argv: string[]): CliArgs | undefined {
  let filePath: string | undefined;
  let outputJson = false;
  let runDir: string | undefined;
  let runId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      outputJson = true;
    } else if (arg === "--run-dir") {
      const value = argv[index + 1];

      if (!value) {
        return undefined;
      }

      runDir = value;
      index += 1;
    } else if (arg === "--run-id") {
      const value = argv[index + 1];

      if (!value) {
        return undefined;
      }

      runId = value;
      index += 1;
    } else if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
    }
  }

  if (!filePath) {
    return undefined;
  }

  return {
    filePath,
    outputJson,
    runDir,
    runId,
  };
}

function writeRunOutputs(
  args: CliArgs,
  input: string,
  items: HandoffItem[],
  output: string,
  outputFormat: HandoffOutputFormat,
): void {
  if (!args.runDir) {
    return;
  }

  const generatedAtDate = new Date();
  const runId = args.runId ?? formatRunTimestamp(generatedAtDate);
  const generatedAt = generatedAtDate.toISOString();
  const runPath = join(args.runDir, runId);
  const outputPath = join(
    runPath,
    outputFormat === "json" ? HANDOFF_JSON_FILE_NAME : HANDOFF_MARKDOWN_FILE_NAME,
  );
  const manifestPath = join(runPath, MOBY_RUN_MANIFEST_FILE_NAME);

  mkdirSync(runPath, { recursive: true });
  writeFileSync(
    outputPath,
    outputFormat === "json" ? `${output}\n` : output,
    "utf8",
  );
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      createMobyRunManifest({
        runId,
        generatedAt,
        inputFile: args.filePath,
        outputFile: outputPath,
        manifestFile: manifestPath,
        outputFormat,
        lineCount: countNonEmptyLines(input),
        items,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function countNonEmptyLines(input: string): number {
  return input.split(/\r?\n/).filter((line) => line.trim()).length;
}

function formatRunTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  const hour = padDatePart(date.getUTCHours());
  const minute = padDatePart(date.getUTCMinutes());
  const second = padDatePart(date.getUTCSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}
