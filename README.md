# Cannabis Shift Handoff

Cannabis Shift Handoff is a lightweight cannabis retail operations tool that turns messy shift notes into structured handoff summaries, follow-up tasks, and manager-ready action items.

It is built for the assistant manager who asks a lot of questions — not because they are annoying, but because they are trying to prevent tomorrow morning from becoming a crime scene with a cash drawer.

## Problem

Dispensary shift handoffs are often inconsistent, incomplete, or trapped in informal notes, group chats, and memory.

Important details about cash drawers, inventory holds, customer complaints, vendor deliveries, compliance issues, and manager instructions can easily get lost between shifts.

This creates avoidable confusion for assistant managers, store managers, inventory teams, and compliance staff.

## User Story

As an assistant manager,
I want messy shift notes converted into a clear handoff summary,
so I can understand what happened, what needs attention, and what might become tomorrow’s problem before it bites me.

## Handoff Categories

- Cash / Drawer Issues
- Inventory Issues
- Product Holds
- Customer Complaints
- Vendor / Receiving Notes
- Compliance / METRC Concerns
- Staff Notes
- Maintenance Issues
- Follow-Up Tasks
- Manager Escalations

## Sample Input

drawer 1 was short 12.75
customer said pre rolls tasted old batch pr-1192
hold blue dream eighths until Sarah checks tags
vendor dropped off invoice but boxes are in vault
bathroom sink leaking again
Aly asked if we checked the cash drop twice

## Sample Output

# Shift Handoff Summary

## Cash / Drawer Issues
- Drawer 1 was short $12.75.
- Follow-up: verify register closeout, cash drop, and shift reconciliation.

## Customer Complaints
- Customer reported old-tasting pre-rolls.
- Batch mentioned: PR-1192.
- Follow-up: inspect product freshness and recent sales history.

## Product Holds
- Blue Dream eighths should remain on hold until Sarah verifies tags.

## Vendor / Receiving
- Vendor dropped off invoice.
- Boxes are currently in the vault.
- Follow-up: confirm receiving process was completed.

## Maintenance
- Bathroom sink is leaking again.
- Follow-up: notify manager or maintenance contact.

## Manager Notes
- Aly requested confirmation that cash drop was checked twice.

## Current Features

- Parses messy dispensary shift notes into categorized handoff items
- Groups notes into manager-friendly Markdown summaries
- Supports JSON output for structured workflows
- Writes optional run-directory handoff artifacts
- Emits a MOBY-compatible run manifest sidecar in run-directory mode
- Assigns rule-based risk levels
- Suggests follow-up actions for known issue types
- Includes regression coverage for real-world phrase collisions like vendor drop-offs vs. cash drops

## Commands

Run the default Markdown handoff:

```sh
npm run handoff -- examples/messy-shift-note.txt
```

The normal command is stdout-only. It prints Markdown and does not create files.

Run JSON output:

```sh
npm run handoff -- examples/messy-shift-note.txt --json
```

`--json` is also stdout-only and prints the parsed `HandoffItem[]` JSON.

## MOBY-compatible output

`--run-dir` is additive: default mode still prints Markdown to stdout, `--json` still prints `HandoffItem[]` JSON to stdout, and explicit run-directory mode also writes MOBY-compatible artifacts under `<run-dir>/<run-id>/`.

Write a default Markdown run artifact:

```sh
npm run handoff -- examples/messy-shift-note.txt --run-dir output/runs --run-id shift-run-001
```

```txt
output/runs/shift-run-001/
|-- handoff-output.md
`-- moby-run-manifest.json
```

Write a JSON run artifact:

```sh
npm run handoff -- examples/messy-shift-note.txt --json --run-dir output/runs --run-id shift-json-run-001
```

```txt
output/runs/shift-json-run-001/
|-- handoff-output.json
`-- moby-run-manifest.json
```

If `--run-id` is omitted, the CLI generates a timestamp-based run ID. `handoff-output.md` or `handoff-output.json` is the normal result artifact, while `moby-run-manifest.json` describes the run, sources, artifacts, warnings, and summary counts.

Committed sample `moby-run-manifest.json` files can be displayed in TrackingTHC MOBY Mission Control at `/moby-runs`, making shift-handoff runs visible alongside other MOBY ecosystem artifacts.

This module does not replace manager judgment. It creates reviewable handoff artifacts and follow-up context so supervisors can make the final operational call.
