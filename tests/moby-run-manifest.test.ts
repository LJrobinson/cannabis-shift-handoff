import { describe, expect, it } from "vitest";
import {
  createMobyRunManifest,
  deriveMobyWarnings,
  toMobyRunStatus,
} from "../src/moby-run-manifest";
import type { HandoffItem } from "../src/categories";

const quietItem: HandoffItem = {
  category: "staff_note",
  text: "manager left a note for opening shift",
  followUpRequired: false,
  confidence: 0.8,
  riskLevel: "low",
  action: "Review manager or staff note for context.",
};

const highRiskItem: HandoffItem = {
  category: "product_hold",
  text: "hold blue dream eighths until Sarah checks tags",
  followUpRequired: true,
  confidence: 0.8,
  riskLevel: "high",
  action: "Keep product off the sales floor until reviewed and cleared.",
};

const unknownItem: HandoffItem = {
  category: "unknown",
  text: "quiet close with nothing unusual",
  followUpRequired: false,
  confidence: 0.25,
  riskLevel: "low",
};

describe("MOBY run manifest adapter", () => {
  it("sets status to completed when no derived warnings are present", () => {
    expect(toMobyRunStatus([quietItem])).toBe("completed");
  });

  it("sets status to completed_with_warnings for risky or unclear items", () => {
    expect(toMobyRunStatus([highRiskItem])).toBe("completed_with_warnings");
    expect(toMobyRunStatus([unknownItem])).toBe("completed_with_warnings");
  });

  it("includes source notes, handoff output, and MOBY manifest artifacts", () => {
    const manifest = createMobyRunManifest({
      runId: "shift-run-001",
      generatedAt: "2026-05-11T20:00:00.000Z",
      inputFile: "output/runs/shift-run-001/messy-shift-note.txt",
      outputFile: "output/runs/shift-run-001/handoff-output.md",
      manifestFile: "output/runs/shift-run-001/moby-run-manifest.json",
      outputFormat: "markdown",
      lineCount: 1,
      items: [quietItem],
    });

    expect(manifest.artifacts.map((artifact) => artifact.id)).toEqual([
      "artifact_shift_notes_text",
      "artifact_handoff_output",
      "artifact_moby_run_manifest_json",
    ]);
    expect(artifactById(manifest, "artifact_shift_notes_text")).toMatchObject({
      role: "source",
      path: "messy-shift-note.txt",
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

  it("sets summary counts from items, warnings, and artifacts", () => {
    const manifest = createMobyRunManifest({
      runId: "shift-run-001",
      generatedAt: "2026-05-11T20:00:00.000Z",
      inputFile: "output/runs/shift-run-001/messy-shift-note.txt",
      outputFile: "output/runs/shift-run-001/handoff-output.json",
      manifestFile: "output/runs/shift-run-001/moby-run-manifest.json",
      outputFormat: "json",
      lineCount: 2,
      items: [highRiskItem, unknownItem],
    });

    expect(manifest.summary).toMatchObject({
      processedCount: 2,
      successCount: 2,
      warningCount: manifest.warnings.length,
      errorCount: 0,
      metadata: {
        outputFormat: "json",
        followUpCount: 1,
        highRiskCount: 1,
        unknownCount: 1,
        categoryCounts: {
          product_hold: 1,
          unknown: 1,
        },
      },
    });
    expect(manifest.summary.artifactCount).toBe(manifest.artifacts.length);
  });

  it("maps warning metadata from handoff items", () => {
    const warnings = deriveMobyWarnings([highRiskItem, unknownItem]);

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HANDOFF_HIGH_RISK_ITEM",
          severity: "warning",
          message: "High-risk handoff item requires review.",
          field: "riskLevel",
          artifactId: "artifact_handoff_output",
          metadata: expect.objectContaining({
            itemIndex: 0,
            category: "product_hold",
            riskLevel: "high",
            confidence: 0.8,
            followUpRequired: true,
            text: "hold blue dream eighths until Sarah checks tags",
            action: "Keep product off the sales floor until reviewed and cleared.",
          }),
        }),
        expect.objectContaining({
          code: "HANDOFF_FOLLOW_UP_REQUIRED",
          field: "followUpRequired",
          metadata: expect.objectContaining({
            itemIndex: 0,
            category: "product_hold",
          }),
        }),
        expect.objectContaining({
          code: "HANDOFF_LOW_CONFIDENCE_ITEM",
          field: "confidence",
          metadata: expect.objectContaining({
            itemIndex: 1,
            category: "unknown",
            confidence: 0.25,
          }),
        }),
        expect.objectContaining({
          code: "HANDOFF_UNCATEGORIZED_ITEM",
          field: "category",
          metadata: expect.objectContaining({
            itemIndex: 1,
            text: "quiet close with nothing unusual",
          }),
        }),
      ]),
    );
  });
});

function artifactById(
  manifest: ReturnType<typeof createMobyRunManifest>,
  artifactId: string,
) {
  return manifest.artifacts.find((artifact) => artifact.id === artifactId);
}
