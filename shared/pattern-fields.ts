import type { PatternProfile } from "./schema";

/**
 * Centralized typed accessor for the dynamic pattern fields on PatternProfile.
 * The schema declares helpingPattern{1,2,3}Condition/Behavior/Impact/Outcome,
 * hurtingPattern{1,2,3}Condition/Behavior/Impact/Outcome/Emotions/Environment,
 * and blindSpot{1,2,3}Pattern/Outcome — all as text columns. This helper does
 * the unsafe indexed read once, in one place, instead of casting `as any` at
 * every call site.
 */
type PatternProfileLike = PatternProfile | Record<string, unknown> | null | undefined;

function read(profile: PatternProfileLike, key: string): string {
  if (!profile) return "";
  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function getHelpingPattern(profile: PatternProfileLike, n: 1 | 2 | 3) {
  return {
    condition: read(profile, `helpingPattern${n}Condition`),
    behavior: read(profile, `helpingPattern${n}Behavior`),
    impact: read(profile, `helpingPattern${n}Impact`),
    outcome: read(profile, `helpingPattern${n}Outcome`),
  };
}

export function getHurtingPattern(profile: PatternProfileLike, n: 1 | 2 | 3) {
  return {
    condition: read(profile, `hurtingPattern${n}Condition`),
    behavior: read(profile, `hurtingPattern${n}Behavior`),
    impact: read(profile, `hurtingPattern${n}Impact`),
    outcome: read(profile, `hurtingPattern${n}Outcome`),
    emotions: read(profile, `hurtingPattern${n}Emotions`),
    environment: read(profile, `hurtingPattern${n}Environment`),
  };
}

export function getBlindSpot(profile: PatternProfileLike, n: 1 | 2 | 3) {
  return {
    pattern: read(profile, `blindSpot${n}Pattern`),
    outcome: read(profile, `blindSpot${n}Outcome`),
  };
}
