# Payment Flow

## Overview

This document describes the complete payment flow from user click to course access, including Stripe integration, webhook handling, and entitlement management.

---

## Flow Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│ Backend  │────▶│  Stripe  │
│  Clicks  │     │ /checkout│     │ API      │     │ Checkout │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │◀────│ Dashboard│◀────│ Webhook  │◀────│  Stripe  │
│  Access  │     │ Updated  │     │ Handler  │     │  Event   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## Step-by-Step Flow

### 1. User Initiates Purchase

**Frontend:**
```tsx
// Checkout page receives product from URL params
const { product } = useParams(); // 'course1', 'course2', or 'bundle'

const handleCheckout = async () => {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product }),
  });
  
  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe
};
```

### 2. Backend Creates Checkout Session

**Server:**
```typescript
app.post('/api/checkout', isAuthenticated, async (req, res) => {
  const { product } = req.body;
  const userId = req.user.id;
  
  // Product configuration
  const products = {
    course1: { name: 'Self-Discovery GPT', price: 4900 },
    course2: { name: 'Transformation Journal', price: 3900 },
    bundle: { name: 'Complete Bundle', price: 6900 },
  };
  
  const selected = products[product];
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: selected.name },
        unit_amount: selected.price,
      },
      quantity: 1,
    }],
    metadata: {
      userId,
      product,
    },
    success_url: `${process.env.APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.APP_URL}/checkout?canceled=true`,
  });
  
  res.json({ url: session.url });
});
```

### 3. User Completes Payment

User enters payment details on Stripe's hosted checkout page. Stripe handles PCI compliance.

### 4. Stripe Sends Webhook

Stripe sends `checkout.session.completed` event to your webhook endpoint.

**Webhook Handler:**
```typescript
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }),
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
      console.error('Webhook signature verification failed');
      return res.status(400).send('Invalid signature');
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await handleSuccessfulPayment(session);
    }
    
    res.json({ received: true });
  }
);
```

### 5. Create Purchase Record (Idempotent)

**Handler:**
```typescript
async function handleSuccessfulPayment(session) {
  const { userId, product } = session.metadata;
  const sessionId = session.id;
  const amount = session.amount_total;
  
  // Idempotent: Check if already processed
  const existing = await storage.getPurchaseBySessionId(sessionId);
  if (existing) {
    console.log('Session already processed, skipping');
    return;
  }
  
  // Create purchase record
  await storage.createPurchase({
    userId,
    courseType: product,
    amount,
    stripeSessionId: sessionId,
    status: 'completed',
  });
  
  console.log(`Purchase created: ${product} for user ${userId}`);
}
```

### 6. User Redirected to Dashboard

After successful payment, Stripe redirects to `success_url`. Dashboard fetches purchases and shows unlocked courses.

---

## Entitlement Checking

### On Every Protected Route

```typescript
function requireEntitlement(course: 'course1' | 'course2') {
  return async (req, res, next) => {
    const userId = req.user.id;
    const purchases = await storage.getPurchasesByUser(userId);
    
    const hasAccess = purchases.some(p => 
      p.status === 'completed' && 
      (p.courseType === course || p.courseType === 'bundle')
    );
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Course access required',
        code: 'ENTITLEMENT_REQUIRED'
      });
    }
    
    next();
  };
}
```

### Dashboard Display

```typescript
app.get('/api/user/entitlements', isAuthenticated, async (req, res) => {
  const purchases = await storage.getPurchasesByUser(req.user.id);
  
  const entitlements = {
    hasCourse1: purchases.some(p => 
      p.courseType === 'course1' || p.courseType === 'bundle'
    ),
    hasCourse2: purchases.some(p => 
      p.courseType === 'course2' || p.courseType === 'bundle'
    ),
  };
  
  res.json(entitlements);
});
```

---

## Payment Reliability

### Problem: Duplicate Webhooks

Stripe may retry webhooks or send duplicates. Without protection, users could get multiple purchase records.

### Solution: Idempotent Processing

1. **Unique Constraint:** `stripe_session_id` column has UNIQUE constraint
2. **Check Before Insert:** Query for existing record before creating
3. **Safe Insert:** Use `createPurchaseIfNotExists` pattern

```typescript
async createPurchaseIfNotExists(data) {
  const existing = await this.getPurchaseBySessionId(data.stripeSessionId);
  if (existing) return existing;
  
  return await db.insert(purchases).values(data).returning();
}
```

### Problem: Payment Succeeded But Access Not Granted

Network issues or server errors might prevent purchase record creation.

### Solution: Self-Service Refresh

1. **Billing Page:** Shows purchase history and access status
2. **Refresh Button:** Calls `/api/billing/refresh`
3. **Re-Check Logic:** Fetches recent Stripe sessions, creates missing records

```typescript
app.post('/api/billing/refresh', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  
  // Get user's Stripe sessions from last 30 days
  const sessions = await stripe.checkout.sessions.list({
    limit: 10,
    expand: ['data.line_items'],
  });
  
  // Filter to this user's completed sessions
  const userSessions = sessions.data.filter(s => 
    s.metadata?.userId === userId && 
    s.payment_status === 'paid'
  );
  
  // Create missing purchase records
  for (const session of userSessions) {
    await storage.createPurchaseIfNotExists({
      userId,
      courseType: session.metadata.product,
      amount: session.amount_total,
      stripeSessionId: session.id,
      status: 'completed',
    });
  }
  
  res.json({ success: true, message: 'Access refreshed' });
});
```

---

## Webhook Events Reference

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create purchase record, grant access |
| `payment_intent.payment_failed` | Log failure, notify user (optional) |
| `charge.refunded` | Revoke access (if implementing refunds) |

---

## Testing Payments

### Stripe Test Mode

Use test API keys and test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

### Webhook Testing

Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

### Manual Testing Checklist

1. [ ] Purchase each product individually
2. [ ] Verify dashboard shows correct access
3. [ ] Test bundle grants both course access
4. [ ] Simulate webhook retry (should not duplicate)
5. [ ] Test refresh button fixes stuck access
6. [ ] Verify canceled checkout doesn't grant access
