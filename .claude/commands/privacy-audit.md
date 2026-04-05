---
name: privacy-audit
description: Check what's needed for privacy policy, terms of service, and legal compliance
---

Audit the app for privacy and legal compliance needs before real users touch it.

## What to check in the code

### Data Collection
- List ALL personal data the app collects (scan database tables and forms)
- Categorize: basic info (name, email) vs sensitive (journals, emotions, triggers, therapy exercises)
- Where is data stored? (PostgreSQL on Replit)
- How long is data retained? (is there a deletion policy?)

### Data Sharing
- Does any user data go to third parties? (check for OpenAI API calls — what data is sent?)
- Are there any analytics scripts? (check index.html and client code)
- Any cookies beyond session cookies?

### User Rights
- Can users export their data? (check /api/export-all)
- Can users delete their account and all data? (check if endpoint exists)
- Can users update/correct their info?

### Security Measures
- Is data encrypted in transit? (HTTPS)
- Is data encrypted at rest?
- Are passwords hashed? (check bcrypt usage)
- Session security settings?

## What's needed before launch

### Must Have
- [ ] Privacy Policy page — what data you collect, why, how long, who sees it
- [ ] Terms of Service — liability, acceptable use, account termination
- [ ] Cookie consent banner (if using cookies beyond essential session)
- [ ] Account deletion endpoint and UI
- [ ] Data export already exists — verify it exports everything

### Should Have
- [ ] Data retention policy (how long do you keep data after account deletion?)
- [ ] Breach notification plan
- [ ] GDPR compliance if any EU users (right to erasure, data portability)

### Nice to Have
- [ ] CCPA compliance if California users
- [ ] Age verification (if restricting to 18+)
- [ ] Accessibility statement (WCAG 2.1)

## Report
List what exists, what's missing, and what to build first. Prioritize by legal risk.
