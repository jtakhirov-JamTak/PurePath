---
name: mobile-check
description: Audit a page for mobile UX issues — touch targets, spacing, scroll, viewport
---

Check the specified page (or all changed pages) for mobile-first UX issues.

## What to check

### Layout
- Does everything fit on a 375px wide screen without horizontal scroll?
- Is there enough padding on the sides (at least 16px)?
- Does content stack properly on narrow screens?
- Is the bottom nav (64px) accounted for with padding-bottom?

### Touch Targets
- Are all buttons/links at least 44x44px tap area?
- Is there enough space between tappable elements (at least 8px)?
- Are checkboxes, toggles, and radio buttons easy to tap?

### Typography
- Is body text at least 16px? (prevents iOS zoom on input focus)
- Are headings readable but not too large on small screens?
- Is there good contrast between text and background?

### Inputs
- Do inputs have proper `type` attributes (email, tel, number)?
- Are textareas tall enough to be usable?
- Does the keyboard not cover the active input?

### Performance Feel
- Are there loading skeletons (not just spinners)?
- Do lists show data without long waits?
- Are images lazy-loaded or properly sized?

### PWA
- Does it feel like a native app, not a website?
- No browser chrome visible in standalone mode?
- Smooth transitions between pages?

## Report
For each issue found:
- What's wrong (plain English)
- Which file and what to change
- Priority: **must fix** / **should fix** / **nice to have**
