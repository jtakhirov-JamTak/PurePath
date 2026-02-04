# Product Requirements Document (PRD)

> **Note:** This document serves as a **template** for building course platforms. Features marked with *(planned)* are design specifications for future implementation, not currently built features.

## Product Overview

**Product Name:** Inner Journey (Template)

**Description:** A self-discovery and personal growth course platform that sells digital courses with integrated AI-powered features. Users authenticate, purchase courses, and access personalized content through a dashboard.

## Target Users

- Individuals seeking personal growth and self-discovery
- People interested in journaling and reflection practices
- Users who want AI-guided introspection tools

## Core Value Proposition

Combine AI-powered self-discovery conversations with structured journaling to help users understand themselves better and track their personal growth journey.

---

## Product Offerings

### Course 1: Self-Discovery GPT
**Price:** $49 (one-time)

**Features:**
- AI-powered chat interface for guided self-discovery
- Streaming responses for natural conversation flow
- Persistent chat history across sessions
- Thoughtful prompts designed by personal growth experts

### Course 2: Transformation Journal
**Price:** $39 (one-time)

**Features:**
- Calendar-based daily journaling system
- Morning and evening journal prompts
- Mood tracking
- PDF and JSON export *(current)*
- Multi-format export: CSV, TXT, DOCX *(planned)*
- Date range filtering for exports *(planned)*
- Export history tracking *(planned)*

### Complete Bundle
**Price:** $69 (one-time) — saves $19

**Features:**
- Full access to both courses
- All features included

---

## Functional Requirements

### Authentication
- Users must be able to sign up and log in
- Session persistence across browser refreshes
- Secure logout functionality

### Payment Processing
- Stripe Checkout for secure payments
- One-time purchase model (not subscriptions)
- Support for individual courses and bundle
- Webhook handling for payment confirmation
- Idempotent processing to prevent duplicate grants

### Dashboard
- Display owned courses with access buttons
- Show locked courses with purchase CTAs
- Quick access to billing/purchase history
- Visual distinction between owned and locked content

### Course 1: AI Chat
- Streaming chat interface
- Message persistence
- System prompt defining AI behavior
- Rate limiting to control costs (optional)
- Token usage tracking (optional)

### Course 2: Journaling
- Calendar view for date selection
- Morning/evening entry forms
- Mood selection
- Auto-save functionality
- Multi-format export with date range selection
- Export history with re-download capability

### Billing
- View purchase history with dates and amounts
- "Refresh Access" button for payment reconciliation
- Order status display

---

## Non-Functional Requirements

### Performance
- Chat responses should begin streaming within 2 seconds
- Page loads under 3 seconds
- Export generation under 10 seconds for typical data volumes

### Security
- All secrets stored in environment variables
- Server-side entitlement checks on every protected route
- HTTPS for all connections
- Session-based authentication with secure cookies

### Accessibility
- Responsive design (mobile, tablet, desktop)
- Keyboard navigation support
- Semantic HTML structure
- Sufficient color contrast

### Reliability
- Idempotent webhook processing
- Self-service payment reconciliation
- Graceful error handling with user-friendly messages

---

## Success Metrics

- Conversion rate from landing page to purchase
- Course completion/engagement rates
- Journal entry frequency per user
- AI chat session duration and message count
- Export usage frequency
- Support ticket volume for payment issues (should be low)

---

## Out of Scope (v1)

- Subscription billing model
- Mobile native apps
- Social features / community
- Admin dashboard
- Analytics dashboard
- Multi-language support
- Offline mode
