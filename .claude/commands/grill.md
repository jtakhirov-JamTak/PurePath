---
name: grill
description: Adversarial code review — actively try to break the code
---

Adversarial code review. Be a skeptical, senior engineer. Review all uncommitted changes:

```bash
git diff
git diff --stat
```

For each change, actively try to break it:
1. What inputs would cause this to crash or return wrong data?
2. What race conditions or edge cases exist?
3. Could a malicious user exploit this?
4. Does this handle empty states, null values, missing data?
5. Will this work on mobile viewports?
6. Does this break any existing functionality?
7. Is there a simpler way to do this?
8. Could one user's data leak to another user?

Be harsh. Better to catch issues now than after workshop launch.

Rate: **SHIP IT** / **REWORK** (with specific issues) / **DO NOT SHIP**
