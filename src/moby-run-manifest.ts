import { basename, dirname, relative, resolve } from "node:path";
import type {
  ExternalSystem,
  MobyArtifact,
  MobyRunManifest,
  MobyRunStatus,
  MobyWarning,
} from "moby-core";
import type { HandoffCategory, HandoffItem } from "./categories";

export const HANDOFF_MARKDOWN_FILE_NAME = "handoff-output.md";
export const HANDOFF_JSON_FILE_NAME = "handoff-output.json";
export const MOBY_RUN_MANIFEST_FILE_NAME = "moby-run-manifest.json";

export type HandoffOutputFormat = "markdown" | "json";

export type HandoffWarningCode =
  | "HANDOFF_HIGH_RISK_ITEM"
  | "HANDOFF_FOLLOW_UP_REQUIRED"
  | "HANDOFF_LOW_CONFIDENCE_ITEM"
  | "HANDOFF_UNCATEGORIZED_ITEM"
  | "HANDOFF_WARNING";

export type MobyRunManifestInput = {
  runId: string;
  generatedAt: string;
  inputFile: string;
  outputFile: string;
  manifestFile: string;
  outputFormat: HandoffOutputFormat;
  lineCount: number;
  items: HandoffItem[];
};

type DerivedWarning = {
  code: HandoffWarningCode;
  field?: string;
  message: string;
  item: HandoffItem;
  itemIndex: number;
};

export function toMobyRunStatus(items: HandoffItem[]): MobyRunStatus {
  return deriveMobyWarnings(items).length > 0
    ? "completed_with_warnings"
    : "completed";
}

export function createMobyRunManifest(
  args: MobyRunManifestInput,
): MobyRunManifest {
  const artifacts = toArtifacts(args);
  const warnings = deriveMobyWarnings(args.items);
  const categoryCounts = getCategoryCounts(args.items);
  const followUpCount = args.items.filter((item) => item.followUpRequired).length;
  const highRiskCount = args.items.filter(
    (item) => item.riskLevel === "high",
  ).length;
  const unknownCount = args.items.filter(
    (item) => item.category === "unknown",
  ).length;

  return {
    schemaVersion: "1.0",
    runId: args.runId,
    runType: "cannabis_shift_handoff",
    generatedBy: "cannabis-shift-handoff",
    generatedAt: args.generatedAt,
    status: warnings.length > 0 ? "completed_with_warnings" : "completed",
    startedAt: args.generatedAt,
    completedAt: args.generatedAt,
    sources: [
      {
        system: getShiftNotesSourceSystem(),
        name: "Shift notes",
        fileName: basename(args.inputFile),
        filePath: args.inputFile,
        receivedAt: args.generatedAt,
        metadata: {
          lineCount: args.lineCount,
          outputFormat: args.outputFormat,
        },
      },
    ],
    artifacts,
    warnings,
    summary: {
      processedCount: args.items.length,
      successCount: args.items.length,
      warningCount: warnings.length,
      errorCount: 0,
      artifactCount: artifacts.length,
      metadata: {
        outputFormat: args.outputFormat,
        followUpCount,
        highRiskCount,
        unknownCount,
        categoryCounts,
      },
    },
    metadata: {
      inputFile: args.inputFile,
      outputFile: args.outputFile,
      outputFormat: args.outputFormat,
      itemCount: args.items.length,
      followUpCount,
      highRiskCount,
      unknownCount,
      categories: Object.keys(categoryCounts),
    },
  };
}

export function deriveMobyWarnings(items: HandoffItem[]): MobyWarning[] {
  return items.flatMap((item, itemIndex) =>
    deriveWarningsForItem(item, itemIndex).map(toMobyWarning),
  );
}

function deriveWarningsForItem(
  item: HandoffItem,
  itemIndex: number,
): DerivedWarning[] {
  const warnings: DerivedWarning[] = [];

  if (item.riskLevel === "high") {
    warnings.push({
      code: "HANDOFF_HIGH_RISK_ITEM",
      field: "riskLevel",
      message: "High-risk handoff item requires review.",
      item,
      itemIndex,
    });
  }

  if (item.followUpRequired) {
    warnings.push({
      code: "HANDOFF_FOLLOW_UP_REQUIRED",
      field: "followUpRequired",
      message: "Handoff item requires follow-up.",
      item,
      itemIndex,
    });
  }

  if (item.confidence < 0.5) {
    warnings.push({
      code: "HANDOFF_LOW_CONFIDENCE_ITEM",
      field: "confidence",
      message: "Handoff item has low classification confidence.",
      item,
      itemIndex,
    });
  }

  if (item.category === "unknown") {
    warnings.push({
      code: "HANDOFF_UNCATEGORIZED_ITEM",
      field: "category",
      message: "Handoff item could not be categorized.",
      item,
      itemIndex,
    });
  }

  return warnings;
}

function toMobyWarning(warning: DerivedWarning): MobyWarning {
  return {
    code: warning.code,
    severity: "warning",
    message: warning.message,
    artifactId: "artifact_handoff_output",
    ...(warning.field ? { field: warning.field } : {}),
    metadata: {
      itemIndex: warning.itemIndex,
      category: warning.item.category,
      riskLevel: warning.item.riskLevel,
      confidence: warning.item.confidence,
      followUpRequired: warning.item.followUpRequired,
      text: warning.item.text,
      ...(warning.item.action ? { action: warning.item.action } : {}),
    },
  };
}

function toArtifacts(args: MobyRunManifestInput): MobyArtifact[] {
  const baseDir = dirname(resolve(args.manifestFile));

  return [
    {
      id: "artifact_shift_notes_text",
      role: "source",
      path: toPortableRelativePath(baseDir, args.inputFile),
      format: "text",
      label: "Shift notes",
      mediaType: "text/plain",
    },
    {
      id: "artifact_handoff_output",
      role: "output",
      path: toPortableRelativePath(baseDir, args.outputFile),
      format: args.outputFormat === "json" ? "json" : "markdown",
      label: "Shift handoff output",
      mediaType:
        args.outputFormat === "json" ? "application/json" : "text/markdown",
    },
    {
      id: "artifact_moby_run_manifest_json",
      role: "manifest",
      path: toPortableRelativePath(baseDir, args.manifestFile),
      format: "json",
      label: "MOBY run manifest",
      mediaType: "application/json",
    },
  ];
}

function getShiftNotesSourceSystem(): ExternalSystem {
  return "manual";
}

function getCategoryCounts(
  items: HandoffItem[],
): Partial<Record<HandoffCategory, number>> {
  return items.reduce<Partial<Record<HandoffCategory, number>>>(
    (counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    },
    {},
  );
}

function toPortableRelativePath(baseDir: string, filePath: string): string {
  const relativePath = relative(baseDir, resolve(filePath));
  const portablePath = relativePath.replace(/\\/g, "/");

  return portablePath || basename(filePath);
}
