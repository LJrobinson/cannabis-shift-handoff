import type { HandoffCategory, HandoffItem } from "./categories";

const rules: Array<{
  category: HandoffCategory;
  keywords: string[];
  followUpRequired?: boolean;
}> = [
  {
    category: "vendor_receiving",
    keywords: ["vendor", "delivery", "invoice", "received", "dropped off", "manifest"],
    followUpRequired: true,
  },
  {
    category: "cash",
    keywords: ["drawer", "cash", "short", "over", "cash drop", "register", "till"],
    followUpRequired: true,
  },
  {
    category: "customer",
    keywords: ["customer", "complaint", "complained", "refund", "angry", "upset"],
    followUpRequired: true,
  },
  {
    category: "inventory",
    keywords: ["inventory", "missing", "count", "variance", "sku", "package"],
    followUpRequired: true,
  },
  {
    category: "product_hold",
    keywords: ["hold", "do not sell", "quarantine", "vault", "pull from floor"],
    followUpRequired: true,
  },
  {
    category: "compliance",
    keywords: ["metrc", "tag", "compliance", "ccb", "biotrack", "package id"],
    followUpRequired: true,
  },
  {
    category: "maintenance",
    keywords: ["leak", "broken", "sink", "toilet", "light", "ac", "door", "safe"],
    followUpRequired: true,
  },
  {
    category: "staff_note",
    keywords: ["sarah", "manager", "aly", "staff", "budtender", "lead"],
    followUpRequired: false,
  },
];

export function parseShiftNotes(input: string): HandoffItem[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => classifyLine(line));
}

function classifyLine(line: string): HandoffItem {
  const normalized = line.toLowerCase();

  const match = rules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (!match) {
    return {
      category: "unknown",
      text: line,
      followUpRequired: false,
      confidence: 0.25,
    };
  }

  return {
    category: match.category,
    text: line,
    followUpRequired: match.followUpRequired ?? false,
    confidence: 0.8,
  };
}