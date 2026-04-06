# Routes & Access Control

## Overview

This document maps all routes, their access requirements, and the middleware patterns used to enforce access control.

---

## Route Map

### Public Routes (No Authentication)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | Landing page | Hero, features, pricing |
| `/auth` | Login / Register | Email + password auth with access code at registration |
| `POST /api/auth/register` | Create account | Rate-limited, requires access code |
| `POST /api/auth/login` | Sign in | Rate-limited |
| `POST /api/auth/logout` | Sign out | Destroys session |
| `GET /api/logout` | Sign out (GET) | Backward compat, redirects to `/` |

### Authenticated Routes (Login Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/dashboard` | User's main dashboard | `isAuthenticated` |
| `GET /api/auth/user` | Current user info | `isAuthenticated` |
| `GET /api/access-status` | Check if user has access | `isAuthenticated` |

### Access-Gated Routes (Access Code Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/api/journals` | Journal CRUD | `isAuthenticated` + access check |
| `/api/habits` | Habit CRUD | `isAuthenticated` + access check |
| `/api/eisenhower` | Weekly planning | `isAuthenticated` + access check |
| `/api/identity-document` | Identity doc | `isAuthenticated` + access check |
| `/api/pattern-profile` | Pattern profile (GET/PUT) | `isAuthenticated` + access check |
| `/api/tools/*` | Containment, triggers, avoidance | `isAuthenticated` + access check |
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
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
```

**Usage:** Applied to all routes requiring login.

### Access Checking

Access is controlled via `userSettings.hasAccess`, set automatically when a valid access code is provided during registration.

```typescript
// Server-side: check access status
app.get("/api/access-status", isAuthenticated, async (req, res) => {
  const userId = req.user.claims.sub;
  const settings = await storage.getUserSettings(userId);
  res.json({ hasAccess: settings?.hasAccess === true });
});
```

---

## Frontend Route Protection

### AccessGatedRoute Component

Routes that require access are wrapped in `AccessGatedRoute`, which checks `userSettings.hasAccess` and redirects to `/auth` if not granted.

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
