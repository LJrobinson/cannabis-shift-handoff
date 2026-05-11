import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type MobyRunManifestSidecar = {
  schemaVersion: string;
  runId: string;
  runType: string;
  generatedBy: string;
  generatedAt: string;
  status: string;
  sources: Array<{
    system: string;
    name?: string;
    fileName?: string;
    filePath?: string;
    receivedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  artifacts: Array<{
    id: string;
    role: string;
    path: string;
    format: string;
    mediaType?: string;
  }>;
  warnings: Array<{
    code: string;
    severity: string;
    message: string;
    artifactId?: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }>;
  summary: {
    processedCount: number;
    successCount: number;
    warningCount: number;
    errorCount: number;
    artifactCount: number;
    metadata?: Record<string, unknown>;
  };
};

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const cliPath = path.join(projectRoot, "src", "cli.ts");
const tsxCliPath = require.resolve("tsx/cli");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("Cannabis Shift Handoff CLI", () => {
  it("keeps default Markdown stdout behavior without creating files", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const sourceFile = path.join(projectRoot, "examples", "messy-shift-note.txt");
    const result = await runCli([sourceFile]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("# Shift Handoff Summary");
    expect(result.stdout).toContain("Cash / Drawer Issues");
    await expectMissing(runDir);
  });

  it("keeps JSON stdout behavior without creating files", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const sourceFile = path.join(projectRoot, "examples", "messy-shift-note.txt");
    const result = await runCli([sourceFile, "--json"]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");

    const json = JSON.parse(result.stdout) as Array<{
      category: string;
      text: string;
    }>;

    expect(json).toHaveLength(6);
    expect(json[0]?.category).toBe("cash");
    await expectMissing(runDir);
  });

  it("writes Markdown output and MOBY run manifest in run-dir mode", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const runId = "shift-run-001";
    const runPath = path.join(runDir, runId);
    const sourceFile = path.join(projectRoot, "examples", "messy-shift-note.txt");
    const outputPath = path.join(runPath, "handoff-output.md");
    const manifestPath = path.join(runPath, "moby-run-manifest.json");
    const result = await runCli([
      sourceFile,
      "--run-dir",
      runDir,
      "--run-id",
      runId,
    ]);

    expect(result.code).toBe(0);
    await expectFile(outputPath);
    await expectFile(manifestPath);

    const output = await readFile(outputPath, "utf8");
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as MobyRunManifestSidecar;

    expect(result.stdout).toContain(output);
    expect(manifest).toMatchObject({
      schemaVersion: "1.0",
      runId,
      runType: "cannabis_shift_handoff",
      generatedBy: "cannabis-shift-handoff",
      status: "completed_with_warnings",
      sources: [
        {
          system: "manual",
          name: "Shift notes",
          fileName: "messy-shift-note.txt",
          filePath: sourceFile,
          metadata: {
            lineCount: 6,
            outputFormat: "markdown",
          },
        },
      ],
      summary: {
        processedCount: 6,
        successCount: 6,
        errorCount: 0,
        metadata: {
          outputFormat: "markdown",
          followUpCount: 6,
          highRiskCount: 1,
          unknownCount: 0,
        },
      },
    });
    expect(manifest.summary.artifactCount).toBe(manifest.artifacts.length);
    expect(manifest.summary.warningCount).toBe(manifest.warnings.length);
    expect(artifactById(manifest, "artifact_shift_notes_text")).toMatchObject({
      role: "source",
      path: portableRelativePath(runPath, sourceFile),
      format: "text",
      mediaType: "text/plain",
    });
    expect(artifactById(manifest, "artifact_handoff_output")).toMatchObject({
      role: "output",
      path: "handoff-output.md",
      format: "markdown",
      mediaType: "text/markdown",
    });
    expect(
      artifactById(manifest, "artifact_moby_run_manifest_json"),
    ).toMatchObject({
      role: "manifest",
      path: "moby-run-manifest.json",
      format: "json",
      mediaType: "application/json",
    });
  });

  it("writes JSON output in run-dir mode when --json is used", async () => {
    const tempDir = await makeTempDir();
    const runDir = path.join(tempDir, "runs");
    const runId = "shift-json-run-001";
    const runPath = path.join(runDir, runId);
    const sourceFile = path.join(projectRoot, "examples", "messy-shift-note.txt");
    const outputPath = path.join(runPath, "handoff-output.json");
    const manifestPath = path.join(runPath, "moby-run-manifest.json");
    const result = await runCli([
      sourceFile,
      "--json",
      "--run-dir",
      runDir,
      "--run-id",
      runId,
    ]);

    expect(result.code).toBe(0);
    await expectFile(outputPath);
    await expectFile(manifestPath);

    const stdoutJson = JSON.parse(result.stdout) as unknown;
    const outputJson = JSON.parse(await readFile(outputPath, "utf8")) as unknown;
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as MobyRunManifestSidecar;

    expect(outputJson).toEqual(stdoutJson);
    expect(manifest.runId).toBe(runId);
    expect(manifest.summary.metadata).toMatchObject({
      outputFormat: "json",
    });
    expect(artifactById(manifest, "artifact_handoff_output")).toMatchObject({
      role: "output",
      path: "handoff-output.json",
      format: "json",
      mediaType: "application/json",
    });
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "cannabis-shift-handoff-"));
  tempDirs.push(dir);
  return dir;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [tsxCliPath, cliPath, ...args],
      {
        cwd: projectRoot,
        encoding: "utf8",
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          code: getExitCode(error),
          stdout,
          stderr,
        });
      },
    );
  });
}

function getExitCode(error: unknown): number {
  if (!error) {
    return 0;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  ) {
    return (error as { code: number }).code;
  }

  return 1;
}

async function expectFile(filePath: string): Promise<void> {
  await expect(access(filePath, constants.F_OK)).resolves.toBeUndefined();
}

async function expectMissing(filePath: string): Promise<void> {
  await expect(access(filePath, constants.F_OK)).rejects.toMatchObject({
    code: "ENOENT",
  });
}

function artifactById(
  manifest: MobyRunManifestSidecar,
  artifactId: string,
) {
  return manifest.artifacts.find((artifact) => artifact.id === artifactId);
}

function portableRelativePath(fromDir: string, toPath: string): string {
  return path.relative(fromDir, toPath).replace(/\\/g, "/");
}
