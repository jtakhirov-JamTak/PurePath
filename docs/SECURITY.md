# Security Best Practices

## Overview

This document outlines security practices for the course platform. Follow these patterns to prevent common vulnerabilities.

---

## Environment Variables & Secrets

### Golden Rule

**Never hardcode secrets in code.** All credentials come from environment variables.

### Bad Examples

```typescript
// ❌ NEVER DO THIS
const stripe = new Stripe('sk_live_abc123...');
const db = new Pool({ password: 'mysecretpassword' });
const openai = new OpenAI({ apiKey: 'sk-...' });
```

### Good Examples

```typescript
// ✅ ALWAYS DO THIS (Replit environment)
// Stripe: Use Replit Stripe Connector (credentials auto-managed)
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Via connector

// Database: Use Replit-provided DATABASE_URL
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// OpenAI: Use Replit AI Integrations (auto-managed keys)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
```

### Replit Secret Management

| Secret | How to Set | Accessed Via |
|--------|------------|--------------|
| `SESSION_SECRET` | Secrets tab | `process.env.SESSION_SECRET` |
| Database credentials | Automatic | `process.env.DATABASE_URL` |
| Stripe keys | Stripe Connector | Connector SDK |
| OpenAI keys | AI Integrations | `process.env.AI_INTEGRATIONS_OPENAI_API_KEY` |

### Never Expose Secrets

```typescript
// ❌ NEVER log secrets
console.log('API Key:', process.env.STRIPE_SECRET_KEY);

// ❌ NEVER return secrets to frontend
app.get('/api/config', (req, res) => {
  res.json({ stripeKey: process.env.STRIPE_SECRET_KEY }); // NO!
});

// ✅ Only expose public keys if needed
app.get('/api/config', (req, res) => {
  res.json({ stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY });
});
```

---

## Authentication

### Centralized Middleware

Use middleware functions, not inline checks.

```typescript
// ❌ BAD: Repeated inline checks
app.get('/api/journals', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // ... handler
});

app.get('/api/chat', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // ... handler
});

// ✅ GOOD: Reusable middleware
function isAuthenticated(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

app.get('/api/journals', isAuthenticated, journalHandler);
app.get('/api/chat', isAuthenticated, chatHandler);
```

### Session Security

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,  // Prevent XSS access to cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax', // CSRF protection
  },
}));
```

---

## Authorization (Entitlements)

### Server-Side is Authoritative

Never trust frontend for access control decisions.

```typescript
// ❌ BAD: Only frontend check
// In React:
if (user.hasCourse1) {
  return <Course1Content />;
}

// ✅ GOOD: Server validates every request
app.get('/api/chat', isAuthenticated, requireEntitlement('course1'), chatHandler);

// Frontend check is UX only (prevents confusion), not security
```

### Fail Closed

Default to denying access.

```typescript
function requireEntitlement(course: string) {
  return async (req, res, next) => {
    // Default: no access
    let hasAccess = false;
    
    try {
      const purchases = await storage.getPurchasesByUser(req.user.id);
      hasAccess = purchases.some(p => 
        p.status === 'completed' && 
        (p.courseType === course || p.courseType === 'bundle')
      );
    } catch (error) {
      // On error, still deny access
      console.error('Entitlement check failed:', error);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
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
  morningEntry: z.string().max(10000).optional(),
  eveningEntry: z.string().max(10000).optional(),
  mood: z.enum(['happy', 'calm', 'neutral', 'anxious', 'sad']).optional(),
});

app.post('/api/journals', isAuthenticated, async (req, res) => {
  const result = journalSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Invalid input',
      details: result.error.issues,
    });
  }
  
  // Use validated data
  const { date, morningEntry, eveningEntry, mood } = result.data;
  // ...
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

## Webhook Security

### Verify Stripe Signatures

Always verify webhook signatures to prevent spoofing.

```typescript
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }), // Raw body for signature
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send('Invalid signature');
    }
    
    // Process verified event
    // ...
  }
);
```

### Idempotent Processing

Prevent duplicate processing of webhooks.

```typescript
async function handlePayment(session) {
  const sessionId = session.id;
  
  // Check if already processed
  const existing = await storage.getPurchaseBySessionId(sessionId);
  if (existing) {
    console.log('Already processed, skipping');
    return;
  }
  
  // Process payment
  await storage.createPurchase({
    stripeSessionId: sessionId,
    // ...
  });
}
```

---

## Data Protection

### User Data Isolation

Users should only access their own data.

```typescript
app.get('/api/journals', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  
  // ✅ Always filter by authenticated user
  const journals = await db.select()
    .from(journals)
    .where(eq(journals.userId, userId));
  
  res.json(journals);
});

app.get('/api/journals/:id', isAuthenticated, async (req, res) => {
  const journal = await storage.getJournalById(req.params.id);
  
  // ✅ Verify ownership
  if (journal.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(journal);
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

Limit API requests to prevent abuse and control costs.

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/', apiLimiter);

// Stricter limit for AI endpoints (costly)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  message: { error: 'AI usage limit reached, please try again later' },
});

app.use('/api/chat', aiLimiter);
```

---

## Error Handling

### Don't Leak Internal Details

```typescript
// ❌ BAD: Exposes internal error
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

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
- [ ] Entitlements checked server-side
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Error messages don't leak internals
- [ ] Users can only access their own data

### Regular Audits

- [ ] Review access logs for anomalies
- [ ] Check for unused/stale sessions
- [ ] Update dependencies for security patches
- [ ] Review new endpoints for auth/entitlement coverage
