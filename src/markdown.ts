import type { HandoffCategory, HandoffItem } from "./categories";

const labels: Record<HandoffCategory, string> = {
  cash: "Cash / Drawer Issues",
  customer: "Customer Issues",
  inventory: "Inventory Issues",
  product_hold: "Product Holds",
  vendor_receiving: "Vendor / Receiving",
  compliance: "Compliance / METRC",
  maintenance: "Maintenance",
  staff_note: "Staff Notes",
  manager_followup: "Manager Follow-Up",
  unknown: "Uncategorized Notes",
};

export function toMarkdown(items: HandoffItem[]): string {
  const grouped = groupByCategory(items);

  const sections = Object.entries(grouped).map(([category, categoryItems]) => {
    const title = labels[category as HandoffCategory];

    const lines = categoryItems.map((item) => {
      const followUp = item.followUpRequired ? " _(follow-up required)_" : "";
      const action = item.action ? `\n  Action: ${item.action}` : "";
      return `- ${item.text}${followUp}${action}`;
    });

    return `## ${title}\n\n${lines.join("\n")}`;
  });

  return `# Shift Handoff Summary\n\n${sections.join("\n\n")}\n`;
}

function groupByCategory(items: HandoffItem[]) {
  return items.reduce<Record<string, HandoffItem[]>>((groups, item) => {
    groups[item.category] ??= [];
    groups[item.category].push(item);
    return groups;
  }, {});
}
