---
name: launch-checklist
description: Full launch readiness audit
---

Review the entire app for launch readiness. Check every category:

**Security:**
- All routes use `isAuthenticated` middleware
- All queries filter by userId — no cross-user data leaks
- No hard-coded secrets in source code (check for API keys, passwords)
- Input validation on all POST/PATCH endpoints
- Rate limiting on AI and export endpoints
- Session security settings are production-ready

**Privacy:**
- Sensitive data (journals, emotions, triggers) never logged
- Error messages don't leak user content
- No third-party scripts sending user data externally

**UX:**
- All forms have loading/saving states
- Error states handled gracefully with user-friendly messages
- Mobile responsiveness on all pages
- Onboarding flow works end-to-end

**Infrastructure:**
- All env vars documented in `.env.example`
- Database has indexes for common queries (userId + date lookups)
- Production build succeeds cleanly
- No unused dependencies bloating the bundle

Report findings as: **CRITICAL** (must fix) / **IMPORTANT** (should fix) / **NICE-TO-HAVE**
