# Routes & Access Control

## Overview

This document maps all routes, their access requirements, and the middleware patterns used to enforce access control.

---

## Route Map

### Public Routes (No Authentication)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | Landing page | Hero, features, pricing, testimonials |
| `/checkout` | Purchase flow | Redirects to Stripe Checkout |
| `/api/webhooks/stripe` | Stripe webhook | Raw body parsing, signature verification |

### Authenticated Routes (Login Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/dashboard` | User's course dashboard | `isAuthenticated` |
| `/billing` | Purchase history | `isAuthenticated` |
| `/api/user` | Current user info | `isAuthenticated` |
| `/api/purchases` | User's purchases | `isAuthenticated` |
| `/api/billing/refresh` | Re-check entitlements | `isAuthenticated` |

### Paid Routes (Course Access Required)

| Route | Purpose | Middleware |
|-------|---------|------------|
| `/course1` | AI Chat interface | `isAuthenticated`, `hasCourse1` |
| `/course2` | Journal interface | `isAuthenticated`, `hasCourse2` |
| `/api/chat` | AI chat endpoint | `isAuthenticated`, `hasCourse1` |
| `/api/chat/history` | Chat history | `isAuthenticated`, `hasCourse1` |
| `/api/journals` | Journal CRUD | `isAuthenticated`, `hasCourse2` |
| `/api/exports` | Export endpoints | `isAuthenticated`, `hasCourse2` |

---

## Middleware Architecture

### Middleware Chain

```
Request → isAuthenticated → checkEntitlement → Route Handler → Response
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

### Entitlement Middleware Factory

```typescript
function requireEntitlement(entitlement: 'course1' | 'course2') {
  return async (req, res, next) => {
    const userId = req.user.id;
    const purchases = await storage.getPurchasesByUser(userId);
    
    const hasAccess = purchases.some(p => 
      p.courseType === entitlement || p.courseType === 'bundle'
    );
    
    if (!hasAccess) {
      return res.status(403).json({ error: "Course access required" });
    }
    next();
  };
}
```

**Usage:**
```typescript
app.get('/api/chat', isAuthenticated, requireEntitlement('course1'), chatHandler);
app.get('/api/journals', isAuthenticated, requireEntitlement('course2'), journalHandler);
```

---

## Frontend Route Protection

### AuthenticatedRoute Component

```tsx
function AuthenticatedRoute({ component: Component }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) {
    window.location.href = '/api/login';
    return null;
  }
  
  return <Component />;
}
```

### PaidRoute Component

```tsx
function PaidRoute({ course, component: Component }) {
  const { user } = useAuth();
  const { data: purchases } = useQuery({ queryKey: ['/api/purchases'] });
  
  const hasAccess = purchases?.some(p => 
    p.courseType === course || p.courseType === 'bundle'
  );
  
  if (!hasAccess) {
    return <LockedCourseMessage course={course} />;
  }
  
  return <Component />;
}
```

---

## Access Control Best Practices

### 1. Server-Side is Authoritative

Never trust frontend checks alone. The server must verify access on every request.

```typescript
// BAD: Only frontend check
if (user.hasCourse1) showContent();

// GOOD: Server validates on every API call
app.get('/api/chat', isAuthenticated, requireEntitlement('course1'), handler);
```

### 2. Centralized Middleware

Use middleware functions, not inline checks in route handlers.

```typescript
// BAD: Repeated checks in every handler
app.get('/api/chat', (req, res) => {
  if (!req.user) return res.status(401).send('...');
  if (!hasCourse(req.user)) return res.status(403).send('...');
  // ... handler logic
});

// GOOD: Middleware chain
app.get('/api/chat', isAuthenticated, requireEntitlement('course1'), handler);
```

### 3. Fail Closed

Default to denying access. Only grant access when explicitly verified.

```typescript
// Default: no access
let hasAccess = false;

// Only set true if verified
if (validPurchaseExists) {
  hasAccess = true;
}
```

### 4. Audit Logging (Optional)

Log access denials for security monitoring.

```typescript
if (!hasAccess) {
  logger.warn('Access denied', { userId, route, entitlement });
  return res.status(403).json({ error: 'Access denied' });
}
```

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
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

### Common HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST creating resource |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | Logged in but no access |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |
