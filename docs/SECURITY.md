# Security Best Practices

## Overview

This document outlines security practices for the Leaf platform. Follow these patterns to prevent common vulnerabilities.

---

## Environment Variables & Secrets

### Golden Rule

**Never hardcode secrets in code.** All credentials come from environment variables.

### Good Examples

```typescript
// Database: Use Replit-provided DATABASE_URL
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Access code: Set via environment variable
const VALID_ACCESS_CODE = process.env.ACCESS_CODE || "";

// Session secret
app.use(session({ secret: process.env.SESSION_SECRET }));
```

### Replit Secret Management

| Secret | How to Set | Accessed Via |
|--------|------------|--------------|
| `SESSION_SECRET` | Secrets tab | `process.env.SESSION_SECRET` |
| `ACCESS_CODE` | Secrets tab | `process.env.ACCESS_CODE` |
| Database credentials | Automatic | `process.env.DATABASE_URL` |

### Never Expose Secrets

```typescript
// ❌ NEVER log secrets
console.log('Access code:', process.env.ACCESS_CODE);

// ❌ NEVER return secrets to frontend
app.get('/api/config', (req, res) => {
  res.json({ accessCode: process.env.ACCESS_CODE }); // NO!
});
```

---

## Authentication

### Centralized Middleware

Use middleware functions, not inline checks.

```typescript
// ✅ GOOD: Reusable middleware
function isAuthenticated(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

app.get('/api/journals', isAuthenticated, journalHandler);
```

### Session Security

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));
```

---

## Authorization (Access Control)

### Access Code Model

Access is granted when a user submits a valid access code. The `hasAccess` flag in `userSettings` is set to `true` and checked on subsequent requests.

```typescript
// Server-side access check
const settings = await storage.getUserSettings(userId);
const hasAccess = settings?.hasAccess === true;
```

### Server-Side is Authoritative

Never trust frontend for access control decisions. Frontend checks are UX only, not security.

### Fail Closed

Default to denying access.

```typescript
// Default: no access
const settings = await storage.getUserSettings(userId);
if (!settings?.hasAccess) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

## Input Validation

### Validate All Inputs

Never trust user input. Validate with Zod schemas.

```typescript
import { z } from 'zod';

const journalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session: z.enum(['morning', 'evening']),
  content: z.string().max(50000).optional(),
});

app.post('/api/journals', isAuthenticated, async (req, res) => {
  const result = journalSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // Use validated data
});
```

### SQL Injection Prevention

Always use parameterized queries via Drizzle ORM.

```typescript
// ❌ NEVER: String concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ ALWAYS: Parameterized via ORM
const user = await db.select().from(users).where(eq(users.id, userId));
```

---

## Data Protection

### User Data Isolation

Users should only access their own data.

```typescript
app.get('/api/journals', isAuthenticated, async (req, res) => {
  const userId = req.user.claims.sub;

  // ✅ Always filter by authenticated user
  const journals = await db.select()
    .from(journals)
    .where(eq(journals.userId, userId));

  res.json(journals);
});
```

### Sensitive Data Handling

```typescript
// ❌ Don't expose internal IDs or sensitive fields
app.get('/api/user', (req, res) => {
  res.json(req.user); // May include sensitive fields
});

// ✅ Return only necessary fields
app.get('/api/user', (req, res) => {
  const { id, email, firstName, lastName, profileImageUrl } = req.user;
  res.json({ id, email, firstName, lastName, profileImageUrl });
});
```

---

## Rate Limiting

### Prevent Abuse

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/', apiLimiter);
```

---

## Error Handling

### Don't Leak Internal Details

```typescript
// ✅ GOOD: Generic message, log internally
app.use((err, req, res, next) => {
  console.error('Internal error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});
```

---

## Security Checklist

### Before Deployment

- [ ] All secrets in environment variables
- [ ] No secrets logged or exposed
- [ ] Session cookies are httpOnly and secure
- [ ] All routes have appropriate authentication
- [ ] Access checked server-side via `userSettings.hasAccess`
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Error messages don't leak internals
- [ ] Users can only access their own data
