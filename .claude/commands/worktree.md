---
name: worktree
description: Create git worktree for parallel work
---

Create a git worktree for working on a separate feature in parallel:

```bash
git branch -a
git worktree list
```

1. Create a new branch: `feature/$ARGUMENTS`
2. Create a worktree at `../proof-arc-$ARGUMENTS`
3. Report the path so you can open a second Claude Code session there

When done, merge back with:
```
git checkout main && git merge feature/$ARGUMENTS && git worktree remove ../proof-arc-$ARGUMENTS
```

Task name: $ARGUMENTS
