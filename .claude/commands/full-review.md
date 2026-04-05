---
name: full-review
description: Run the complete review pipeline — tests, grill, code review, security, architecture
---

Run the full review pipeline on all uncommitted changes. Stop if any step rates "DO NOT SHIP":

## Step 1: Verify Everything Passes
Launch verify-app agent — run type check, unit tests, E2E tests, production build. Fix failures before continuing. If code doesn't compile or tests fail, no point reviewing it.

## Step 2: Adversarial Review
Run `/grill` — actively try to break the code. Look for crashes, edge cases, exploits, mobile issues, data leaks.

## Step 3: Code Review
Run `/review-changes` — check for bugs, security gaps, pattern violations, simpler alternatives.

## Step 4: Security Review
Launch security-reviewer agent — check auth, data isolation, input validation, sensitive data exposure, rate limiting.

## Step 5: Architecture Review
Launch staff-reviewer agent — check abstractions, complexity, data model, performance, consistency, UX.

## Step 6: Mobile Check
Run `/mobile-check` on all changed pages — check touch targets, spacing, viewport fit, input sizing, PWA feel. This app is mobile-first.

## Final Report
Summarize results from all 6 steps:
- List any issues found and fixed
- List any remaining concerns
- Number each remaining issue
- Rate: **READY TO PUSH** / **NEEDS WORK** (with specific items)

## Step 7: Offer to Fix
If the rating is **NEEDS WORK**, ask the user:
"Want me to fix any of these? Give me the numbers or say 'all'."

For each issue the user picks, run `/fix-bug` on it. After fixing, re-run only the review steps that originally caught the issue to confirm it's resolved. Don't re-run the full pipeline — just verify the specific fix.
