-- One-time migration: promote all "minimum" habit completions to "completed"
-- Run this once after deploying the binary completion UI rewrite.
-- Safe to run multiple times (idempotent).

UPDATE habit_completions
SET completion_level = 2, status = 'completed'
WHERE completion_level = 1 AND status = 'minimum';
