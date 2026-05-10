import type { HandoffCategory, HandoffItem, RiskLevel } from "./categories";

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

const actionByCategory: Partial<Record<HandoffCategory, string>> = {
  cash: "Verify drawer closeout, cash drop, and register reconciliation.",
  customer: "Review complaint details and inspect related product or transaction.",
  vendor_receiving: "Confirm invoice or manifest before completing receiving.",
  compliance: "Verify compliance identifiers, package tags, and related records.",
  maintenance: "Notify manager or maintenance contact and track resolution.",
  product_hold: "Keep product off the sales floor until reviewed and cleared.",
  inventory: "Investigate count, package, or inventory variance.",
  staff_note: "Review manager or staff note for context.",
};

const defaultRiskByCategory: Record<HandoffCategory, RiskLevel> = {
  cash: "medium",
  customer: "medium",
  inventory: "medium",
  product_hold: "high",
  vendor_receiving: "medium",
  compliance: "high",
  maintenance: "medium",
  staff_note: "low",
  manager_followup: "medium",
  unknown: "low",
};

const highRiskPhrases = [
  "metrc",
  "tag",
  "compliance",
  "ccb",
  "package id",
  "do not sell",
  "hold",
  "quarantine",
  "pull from floor",
];

const mediumRiskPhrases = [
  "short",
  "over",
  "drawer",
  "cash drop",
  "leak",
  "broken",
  "safe",
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
      riskLevel: getRiskLevel("unknown", normalized),
    };
  }

  return {
    category: match.category,
    text: line,
    followUpRequired: match.followUpRequired ?? false,
    confidence: 0.8,
    riskLevel: getRiskLevel(match.category, normalized),
    action: actionByCategory[match.category],
  };
}

function getRiskLevel(category: HandoffCategory, normalizedText: string): RiskLevel {
  if (highRiskPhrases.some((phrase) => normalizedText.includes(phrase))) {
    return "high";
  }

  if (mediumRiskPhrases.some((phrase) => normalizedText.includes(phrase))) {
    return "medium";
  }

  return defaultRiskByCategory[category];
}
