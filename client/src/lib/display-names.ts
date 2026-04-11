/** Canonical display names for pattern types.
 *  Schema uses helpingPattern/hurtingPattern — never show those to users. */
export const PATTERN_LABELS = {
  success: "Success Pattern",
  successPlural: "Success Patterns",
  shadow: "Shadow Pattern",
  shadowPlural: "Shadow Patterns",
  avoidanceLoop: "Avoidance Loop",
  triggerPattern: "Repeating Trigger Pattern",
} as const;
