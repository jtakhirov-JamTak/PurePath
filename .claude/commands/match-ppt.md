---
name: match-ppt
description: Compare app screens to workshop PPT slides and list visual differences
---

Compare the current app UI to the workshop PowerPoint/PDF.

## Steps

1. Ask the user which screen or page to compare (e.g., dashboard, journal, habits)
2. Read the relevant page source file to understand current layout and styling
3. Ask the user to provide a screenshot of the PPT slide showing what that screen should look like
4. Compare the two and list specific differences:
   - Layout (spacing, alignment, order of elements)
   - Colors (backgrounds, text, accents, buttons)
   - Typography (font sizes, weights, spacing)
   - Components (missing elements, extra elements, wrong style)
   - Mobile feel (does it feel like a native app?)
5. Propose specific CSS/component changes to close the gap
6. Wait for approval before implementing

Keep changes scoped — fix one screen at a time, don't touch other pages.
