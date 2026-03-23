# Routes & Access Control

## Overview

This document maps all routes, their access requirements, and the middleware patterns used to enforce access control.

---

## Route Map

### Public Routes (No Authentication)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | Landing page | Hero, features, pricing |
| `/access` | Access code entry | User enters workshop access code to unlock the app |

### Authenticated Routes (Login Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/dashboard` | User's main dashboard | `isAuthenticated` |
| `/api/user` | Current user info | `isAuthenticated` |
| `/api/access-status` | Check if user has access | `isAuthenticated` |
| `/api/verify-access-code` | Submit access code | `isAuthenticated` |

### Access-Gated Routes (Access Code Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/api/journals` | Journal CRUD | `isAuthenticated` + access check |
| `/api/habits` | Habit CRUD | `isAuthenticated` + access check |
| `/api/eisenhower` | Weekly planning | `isAuthenticated` + access check |
| `/api/empathy` | EQ exercises | `isAuthenticated` + access check |
| `/api/export-all` | Full data export | `isAuthenticated` + rate limit |

---

## Middleware Architecture

### Middleware Chain

```
Request → isAuthenticated → Route Handler → Response
```

### isAuthenticated Middleware

```typescript
function isAuthenticated(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
```

**Usage:** Applied to all routes requiring login.

### Access Checking

Access is controlled via `userSettings.hasAccess`, set when a valid access code is verified.

```typescript
// Server-side: check access status
app.get("/api/access-status", isAuthenticated, async (req, res) => {
  const userId = req.user.claims.sub;
  const settings = await storage.getUserSettings(userId);
  res.json({ hasAccess: settings?.hasAccess === true });
});

// Server-side: verify access code
app.post("/api/verify-access-code", isAuthenticated, async (req, res) => {
  const { code } = req.body;
  if (code.trim() !== VALID_ACCESS_CODE) {
    return res.status(403).json({ error: "Invalid access code" });
  }
  await storage.upsertUserSettings(userId, { hasAccess: true });
  res.json({ success: true });
});
```

---

## Frontend Route Protection

### AccessGatedRoute Component

Routes that require access are wrapped in `AccessGatedRoute`, which checks `userSettings.hasAccess` and redirects to the access code page if not granted.

---

## Access Control Best Practices

### 1. Server-Side is Authoritative

Never trust frontend checks alone. The server must verify access on every request.

### 2. Centralized Middleware

Use middleware functions, not inline checks in route handlers.

```typescript
// GOOD: Middleware chain
app.get('/api/journals', isAuthenticated, journalHandler);
```

### 3. Fail Closed

Default to denying access. Only grant access when explicitly verified.

---

## API Response Patterns

### Success Responses

```json
{
  "data": { ... },
  "success": true
}
```

### Error Responses

```json
{
  "error": "Human-readable message"
}
```

### Common HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST creating resource |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | Logged in but no access / invalid code |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |
