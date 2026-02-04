# Build Milestones

> **Note:** This document serves as a **build template** for creating course platforms from scratch. It reflects the recommended order for building a platform like Inner Journey.

## Overview

This document outlines the recommended build order for the course platform, with acceptance criteria for each milestone. Each milestone results in a deployable checkpoint.

---

## Milestone 1: Project Setup & Landing Page

### Objectives
- Set up project structure and dependencies
- Implement public landing page
- Configure styling and theme

### Tasks
1. Initialize project with Vite + React + TypeScript
2. Set up Express backend with TypeScript
3. Configure Tailwind CSS with theme variables
4. Create landing page with:
   - Hero section with CTA
   - Features section
   - Pricing cards (Course 1, Course 2, Bundle)
   - Testimonials (optional)
   - Footer
5. Set up routing (Wouter)

### Acceptance Criteria
- [ ] `npm run dev` starts both frontend and backend
- [ ] Landing page renders at `/`
- [ ] Pricing cards display correct prices ($49, $39, $69)
- [ ] "Get Started" buttons are visible (can be non-functional)
- [ ] Responsive on mobile, tablet, desktop
- [ ] Theme colors applied consistently

### Checkpoint: `milestone-1-landing-page`

---

## Milestone 2: Authentication

### Objectives
- Integrate Replit Auth (or alternative auth provider)
- Implement session management
- Create authenticated routes

### Tasks
1. Set up PostgreSQL database
2. Create users and sessions tables
3. Configure Passport.js with OIDC
4. Create login/logout endpoints
5. Implement `isAuthenticated` middleware
6. Create basic dashboard page (authenticated)
7. Add login/logout buttons to navigation

### Acceptance Criteria
- [ ] User can log in via Replit Auth
- [ ] Session persists across page refreshes
- [ ] Dashboard only accessible when logged in
- [ ] Unauthenticated users redirected to login
- [ ] User info displayed on dashboard
- [ ] Logout clears session

### Checkpoint: `milestone-2-auth`

---

## Milestone 3: Database & Journaling

### Objectives
- Create journal entries schema
- Implement CRUD operations
- Build journaling UI

### Tasks
1. Create journals table with Drizzle schema
2. Implement storage methods (create, read, update)
3. Create `/course2` journal page with:
   - Calendar view for date selection
   - Morning/evening text areas
   - Mood selector
   - Save functionality
4. Add API routes for journal operations
5. Implement auto-save (optional)

### Acceptance Criteria
- [ ] User can create journal entry for a date
- [ ] User can edit existing entry
- [ ] Entries persist across sessions
- [ ] Calendar shows dates with entries
- [ ] Morning and evening fields save separately
- [ ] Mood selection works
- [ ] Users only see their own entries

### Checkpoint: `milestone-3-journaling`

---

## Milestone 4: AI Chat Integration

### Objectives
- Integrate OpenAI API
- Build streaming chat interface
- Persist chat history

### Tasks
1. Configure OpenAI client with Replit AI Integrations
2. Create chat_messages table
3. Define system prompt for self-discovery guide
4. Create `/course1` chat page with:
   - Message history display
   - Input field with send button
   - Streaming response rendering
5. Implement API endpoint with streaming

### Acceptance Criteria
- [ ] User can send messages
- [ ] AI responds with streaming text
- [ ] Chat history persists across sessions
- [ ] System prompt shapes AI behavior appropriately
- [ ] Loading state shown while waiting
- [ ] Error handling for API failures

### Checkpoint: `milestone-4-ai-chat`

---

## Milestone 5: Payment Integration

### Objectives
- Integrate Stripe Checkout
- Handle webhooks
- Implement entitlements

### Tasks
1. Set up Stripe Connector
2. Create purchases table with unique stripe_session_id
3. Create checkout endpoint that generates Stripe session
4. Implement webhook handler for `checkout.session.completed`
5. Create `requireEntitlement` middleware
6. Protect Course 1 and Course 2 routes
7. Update dashboard to show locked/unlocked courses

### Acceptance Criteria
- [ ] User can initiate checkout for any product
- [ ] Stripe Checkout page loads correctly
- [ ] Successful payment creates purchase record
- [ ] Duplicate webhooks don't create duplicate purchases
- [ ] Dashboard shows correct access after purchase
- [ ] Bundle grants access to both courses
- [ ] Unpaid users see locked state on dashboard

### Checkpoint: `milestone-5-payments`

---

## Milestone 6: Export System

### Objectives
- Implement multi-format exports
- Build export UI
- Track export history

### Tasks
1. Create export_history table
2. Implement export generators:
   - CSV format
   - TXT format
   - PDF format
   - DOCX format
   - JSON format
3. Create export API endpoint
4. Add date range selection
5. Build export panel in Course 2 UI
6. Create export history list with re-download

### Acceptance Criteria
- [ ] All 5 formats generate correctly
- [ ] Date range filtering works
- [ ] Downloads have correct filenames and MIME types
- [ ] Export history shows previous exports
- [ ] Re-download works from history
- [ ] Only Course 2 purchasers can export

### Checkpoint: `milestone-6-exports`

---

## Milestone 7: Billing & Reliability

### Objectives
- Create billing page
- Implement payment recovery
- Add self-service tools

### Tasks
1. Create `/billing` page showing purchase history
2. Add "Refresh Access" button
3. Implement `/api/billing/refresh` endpoint
4. Add billing link to dashboard header
5. Display order status and dates

### Acceptance Criteria
- [ ] Billing page shows all purchases
- [ ] Refresh button re-checks Stripe and updates access
- [ ] Users can resolve stuck payments without support
- [ ] Order dates and amounts display correctly

### Checkpoint: `milestone-7-billing`

---

## Milestone 8: Polish & Launch Prep

### Objectives
- UI/UX refinements
- Performance optimization
- Security hardening

### Tasks
1. Add loading states throughout app
2. Implement error boundaries
3. Add rate limiting to API endpoints
4. Review and test all access controls
5. Add SEO meta tags to landing page
6. Test mobile responsiveness
7. Review accessibility (keyboard nav, contrast)
8. Create production environment variables

### Acceptance Criteria
- [ ] No console errors in production build
- [ ] All pages load under 3 seconds
- [ ] Rate limiting prevents abuse
- [ ] Security checklist completed
- [ ] Mobile experience is smooth
- [ ] Lighthouse score > 90 for landing page

### Checkpoint: `milestone-8-launch-ready`

---

## Milestone Summary

| # | Milestone | Duration Estimate | Dependencies |
|---|-----------|-------------------|--------------|
| 1 | Landing Page | 1-2 days | None |
| 2 | Authentication | 1 day | 1 |
| 3 | Journaling | 1-2 days | 2 |
| 4 | AI Chat | 1-2 days | 2 |
| 5 | Payments | 1-2 days | 2 |
| 6 | Exports | 1 day | 3, 5 |
| 7 | Billing | 0.5 days | 5 |
| 8 | Polish | 1-2 days | All |

**Total Estimated Time:** 8-13 days for MVP

---

## Post-Launch Enhancements

After core platform is stable, consider:

1. **Rate Limiting & Token Caps** - Control AI costs
2. **Usage Analytics** - Track engagement
3. **Admin Dashboard** - Manage users and content
4. **Email Notifications** - Purchase confirmations
5. **Referral System** - Growth marketing
6. **Subscription Model** - Recurring revenue option
