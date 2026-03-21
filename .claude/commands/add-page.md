---
name: add-page
description: Scaffold a new page following Leaf patterns
---

When I describe a new page, follow these steps:

```bash
head -50 client/src/App.tsx
```

1. Create the page component in `client/src/pages/`
2. Add the route in `client/src/App.tsx` wrapped in `AccessGatedRoute`
3. If it needs nav entry, add to `app-layout.tsx` using `safeNavigate()`
4. If it's a process flow:
   - Register in `client/src/lib/process-registry.ts`
   - Use `<FlowBar>` instead of `<AppLayout>`
   - Launch links use `buildProcessUrl()`
   - Completion uses `useReturnTo().finish()`
5. Use TanStack React Query for data fetching
6. Follow existing page patterns (check `dashboard.tsx` or `habits.tsx` for reference)
7. Run `npm run check` to verify types

Page to add: $ARGUMENTS
