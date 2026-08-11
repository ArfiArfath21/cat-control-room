# Admissions Mode — Product Plan

## Purpose

Extend the CAT control room beyond exam day into a private admissions operating
system: results, applications, WAT/PI preparation, interviews, waitlists,
offers, and the final school decision.

This is a future plan, not part of the current implementation. The immediate
product remains focused on CAT preparation.

## Product transition

Add a compact mode switch in the top-right navigation:

- **CAT Prep** — current dashboard and historical preparation record.
- **Admissions** — post-exam pipeline and interview preparation.

Before results, Admissions mode can remain locked or show a lightweight
"prepare your profile" checklist. After results, it becomes the default mode
while CAT Prep remains available as a read-only archive.

Suggested lifecycle:

1. Exam completed
2. Response sheet and score estimate
3. Results declared
4. Applications submitted
5. Shortlists and calls received
6. WAT/GD/PI preparation
7. Interviews completed
8. Waitlists, converts, and offers
9. Final decision and admission onboarding

## Core feature areas

### 1. Results snapshot

- Record CAT scaled score, overall percentile, and sectional percentiles.
- Compare actual performance with target and mock trajectory.
- Record other exams such as XAT, SNAP, NMAT, or GMAT if relevant.
- Preserve the final preparation dashboard as a retrospective.
- Capture lessons that should inform interviews and future goals.

### 2. Institute pipeline

Each institute should have a structured record:

- Institute and programme
- Application route and category
- Deadline, fee, and submission status
- Eligibility and sectional-cutoff checks
- Predicted shortlist likelihood with assumptions clearly labelled
- Actual shortlist/call status
- Interview date, city, mode, and reporting time
- Result, waitlist number, offer deadline, and deposit deadline
- Notes and official source links

Primary views:

- Kanban: Researching → Applying → Submitted → Shortlisted → Interviewed →
  Waitlisted/Converted/Closed
- Calendar: deadlines, interviews, results, deposits
- Table: sortable comparison across all institutes

### 3. Profile and evidence bank

Build a reusable source of truth for forms, SOPs, and interviews:

- Education history and academic highlights
- Work experience, promotions, projects, and measurable impact
- Internships, positions of responsibility, awards, and extracurriculars
- Career goals: short term, long term, and industry/function choices
- "Why MBA?", "Why now?", and "Why this institute?" answers
- Strengths, weaknesses, failures, conflicts, and ethical dilemmas
- Gaps, low grades, career changes, and other difficult questions
- STAR/CAR stories tagged by competency

Every claim should be connected to evidence, metrics, and a concise spoken
version. Answers should support versions for 30 seconds, 90 seconds, and a
long-form written response.

### 4. WAT/GD/PI preparation

- Daily current-affairs and opinion prompt queue
- WAT timer with saved drafts and revision notes
- Topic bank grouped by economy, business, technology, society, geopolitics,
  ethics, and abstract topics
- Personal interview question bank generated from the profile
- Academics and work-experience revision checklist
- Institute-specific interview patterns and preparation notes
- Mock interview scheduling, recordings/links, feedback, and action items
- Answer confidence and spaced-revision queue

### 5. Interview day workspace

- Institute briefing card
- Interviewer-facing introduction and key stories
- Documents and attire checklist
- Travel plan and reporting-time buffer
- Last-minute facts and questions to ask the panel
- Post-interview debrief captured immediately afterward
- Questions asked, answer quality, panel tone, duration, and follow-up actions

### 6. Offer and decision centre

- Offer, waitlist, deposit, refund, and withdrawal deadlines
- Waitlist movement history
- Total programme cost rather than headline tuition only
- Scholarship and financing details
- Role, sector, geography, batch size, curriculum, culture, and alumni factors
- Weighted decision matrix with user-controlled priorities
- Scenario comparison: accept now, hold, or wait for another result
- Final decision log explaining the reasoning at the time

### 7. Admission onboarding

If the product continues after conversion:

- Document submission and verification checklist
- Loan, scholarship, housing, and relocation tasks
- Pre-MBA reading and skill plan
- Networking/contact tracker for classmates, alumni, and clubs
- Resume refresh and internship-preparation milestones
- Personal goals for term one

## Data model direction

Admissions mode should trigger a move from opaque Redis JSON documents to a
relational Postgres model. Redis can remain for sessions, short-lived caches,
and reminders, but the admissions records should use normalized tables.

Likely entities:

- `users`
- `exam_results`
- `institutes`
- `programmes`
- `applications`
- `application_events`
- `deadlines`
- `profile_stories`
- `written_answers`
- `interview_sessions`
- `interview_questions`
- `feedback_items`
- `offers`
- `waitlist_updates`
- `decision_criteria`
- `documents`

Important requirements:

- Every record belongs to an authenticated user.
- Status changes are historical events, not destructive overwrites.
- Deadlines store timezone explicitly.
- Official URLs and a `verified_at` timestamp accompany factual institute data.
- Sensitive personal documents are private by default.
- Export and deletion are supported from the beginning.

## Suggested releases

### Release 1 — Personal admissions tracker

- Mode switch
- Result snapshot
- Institute/application table
- Deadlines and status pipeline
- Profile story bank
- JSON/CSV export

### Release 2 — Interview control room

- WAT/PI question bank
- Practice sessions and feedback
- Institute briefing pages
- Interview-day checklist and debrief

### Release 3 — Decision and onboarding

- Offers and waitlists
- Decision matrix
- Deposit/refund reminders
- Admission onboarding checklist

## Design principles

- Keep the control-room visual language, but change the emphasis from daily
  repetition to pipeline clarity and deadline safety.
- Show the next consequential action, not a wall of information.
- Separate verified facts from estimates and predictions.
- Never manufacture institute rules, dates, cutoffs, or placement claims.
- Make every critical record exportable.
- Preserve CAT Prep as a useful historical record rather than deleting it.

## Open decisions for the build phase

- Whether Admissions mode remains single-user or becomes a reusable product
- Authentication provider and account-recovery approach
- Postgres provider and migration strategy
- Whether institute data is entered manually or imported from official sources
- Notification channels: in-app, email, calendar, or messaging
- Document storage and encryption requirements
- Whether AI-generated interview feedback is in scope

## Definition of success

The mode succeeds if, at any point after CAT, the user can answer three questions
within ten seconds:

1. What is the next deadline or decision?
2. What preparation action has the highest leverage today?
3. Where does every application, interview, waitlist, and offer currently stand?
