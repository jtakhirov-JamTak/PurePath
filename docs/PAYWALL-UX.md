# Paywall UX Behavior

## Overview

This document specifies the exact user experience when hitting locked/paid content.

---

## Paywall Strategy: Modal with Return

When a user tries to access paid content without a purchase, we show an **overlay modal** (not a redirect). After payment, the user returns to the page they were trying to access.

---

## Behavior by Route

| Route | Unauthenticated User | Authenticated (No Purchase) | Authenticated (Has Purchase) |
|-------|----------------------|------------------------------|------------------------------|
| `/course1` | Show login modal | Show paywall modal | Full access |
| `/course2` | Show login modal | Show paywall modal | Full access |
| `/api/chat/*` | 401 JSON | 403 JSON | 200 + data |
| `/api/journals/*` | 401 JSON | 403 JSON | 200 + data |

---

## Modal Flow

### 1. User Navigates to Locked Page

User clicks "Start Course 1" from dashboard without purchase.

### 2. Paywall Modal Appears

```
┌─────────────────────────────────────────────┐
│                                             │
│         🔒 Unlock Self-Discovery GPT        │
│                                             │
│   Get unlimited access to your personal    │
│   AI guide for just $49 (one-time).        │
│                                             │
│   [   Purchase Now - $49   ]               │
│                                             │
│   or get both courses for $69              │
│   [   Get the Bundle - Save $19   ]        │
│                                             │
│                    [Cancel]                 │
└─────────────────────────────────────────────┘
```

### 3. User Clicks Purchase

- Store current URL in session/localStorage: `returnUrl = /course1`
- Redirect to Stripe Checkout

### 4. Payment Completes

- Stripe redirects to `/checkout/success?session_id=...`
- Success page checks for `returnUrl`
- Redirects to original page: `/course1`

### 5. User Lands on Unlocked Content

Course page renders normally with full access.

---

## Implementation Notes

### Frontend: LockedCourseModal Component

```tsx
function LockedCourseModal({ course, onClose }) {
  const handlePurchase = (courseType) => {
    // Store return URL before redirect
    localStorage.setItem('returnUrl', window.location.pathname);
    window.location.href = `/checkout?product=${courseType}`;
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <Lock className="h-8 w-8 text-muted-foreground" />
          <DialogTitle>Unlock {course.name}</DialogTitle>
        </DialogHeader>
        <p>Get unlimited access for just ${course.price / 100}.</p>
        <Button onClick={() => handlePurchase(course.id)}>
          Purchase Now - ${course.price / 100}
        </Button>
        <Button variant="outline" onClick={() => handlePurchase('bundle')}>
          Get the Bundle - Save $19
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Checkout Success: Return URL Handling

```tsx
// /checkout/success page
useEffect(() => {
  const returnUrl = localStorage.getItem('returnUrl');
  if (returnUrl) {
    localStorage.removeItem('returnUrl');
    setTimeout(() => navigate(returnUrl), 2000);
  }
}, []);
```

---

## Why Modal Over Redirect?

| Approach | Pros | Cons |
|----------|------|------|
| **Modal (chosen)** | User sees they're close to content, higher conversion | Slightly more complex |
| Redirect to /pricing | Simple | User loses context, lower conversion |
| Inline locked state | Good for previews | Not applicable without preview content |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User clicks Cancel on modal | Modal closes, stays on dashboard |
| User cancels Stripe checkout | Returns to `/checkout/cancel`, can retry |
| returnUrl expired/invalid | Redirect to `/dashboard` as fallback |
| User already has course | No modal shown, full access |
| Bundle owner accessing course | Full access to both courses |
