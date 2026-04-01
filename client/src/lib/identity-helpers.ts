import type { IdentityDocument } from "@shared/schema";

type IdentityContentFields = Omit<IdentityDocument, "id" | "userId" | "updatedAt">;

/**
 * Build a full identity document payload for PUT /api/identity-document.
 * Pass the current doc as base, then override only the fields you changed.
 */
export function buildIdentityDocPayload(
  doc: IdentityDocument | undefined,
  overrides: Partial<IdentityContentFields> = {}
) {
  return {
    identity: doc?.identity || "",
    vision: doc?.vision || "",
    values: doc?.values || "",
    yearVision: doc?.yearVision || "",
    yearVisualization: doc?.yearVisualization || "",
    purpose: doc?.purpose || "",
    todayValue: doc?.todayValue || "",
    todayIntention: doc?.todayIntention || "",
    todayReflection: doc?.todayReflection || "",
    visionBoardMain: doc?.visionBoardMain || "",
    visionBoardLeft: doc?.visionBoardLeft || "",
    visionBoardRight: doc?.visionBoardRight || "",
    othersWillSee: doc?.othersWillSee || "",
    beYourself: doc?.beYourself || "",
    strengths: doc?.strengths || "",
    helpingPatterns: doc?.helpingPatterns || "",
    hurtingPatterns: doc?.hurtingPatterns || "",
    stressResponses: doc?.stressResponses || "",
    visionDomain: doc?.visionDomain || "",
    ...overrides,
  };
}
