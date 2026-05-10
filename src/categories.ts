export const HANDOFF_CATEGORIES = [
  "cash",
  "customer",
  "inventory",
  "product_hold",
  "vendor_receiving",
  "compliance",
  "maintenance",
  "staff_note",
  "manager_followup",
  "unknown",
] as const;

export type HandoffCategory = (typeof HANDOFF_CATEGORIES)[number];

export type RiskLevel = "low" | "medium" | "high";

export type HandoffItem = {
  category: HandoffCategory;
  text: string;
  followUpRequired: boolean;
  confidence: number;
  riskLevel: RiskLevel;
  action?: string;
};
