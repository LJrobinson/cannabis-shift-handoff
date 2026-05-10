import { describe, expect, it } from "vitest";
import { parseShiftNotes } from "../src/parser";
import { toMarkdown } from "../src/markdown";

describe("Cannabis Shift Handoff", () => {
  it("turns messy shift notes into categorized handoff items", () => {
    const input = `
drawer 1 was short 12.75
customer complained about old prerolls
hold blue dream eighths until Sarah checks tags
bathroom sink leaking again
`;

    const result = parseShiftNotes(input);

    expect(result).toHaveLength(4);
    expect(result[0].category).toBe("cash");
    expect(result[1].category).toBe("customer");
    expect(result[2].category).toBe("product_hold");
    expect(result[3].category).toBe("maintenance");
  });

  it("renders a markdown handoff summary", () => {
    const input = "drawer 1 was short 12.75";
    const items = parseShiftNotes(input);
    const markdown = toMarkdown(items);

    expect(markdown).toContain("# Shift Handoff Summary");
    expect(markdown).toContain("Cash / Drawer Issues");
    expect(markdown).toContain("follow-up required");
  });

  it("classifies vendor drop-offs as vendor receiving, not cash", () => {
  const input = "vendor dropped off rythm but no invoice";

  const result = parseShiftNotes(input);

  expect(result).toHaveLength(1);
  expect(result[0].category).toBe("vendor_receiving");
  });
});