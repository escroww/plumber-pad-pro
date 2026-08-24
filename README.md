# Flowline Pro

Flowline — Project Requirements Document

Version: 1.0 Date: July 2026 Owner: Aron

1. Overview

Flowline is a business management app built for independent plumbers — starting narrow, one trade, one clear pain point. It replaces the notebook/memory/text-message chaos most solo plumbers currently run their business on with one organized tool covering job requests, scheduling, invoicing, payments, and customer communication.

This is not a marketplace. Customers do not browse or discover a new plumber inside the app. It is a private tool for a plumber's own existing customer base — the app organizes what happens after contact is made, it does not create the contact.

2. Problem Statement

Plumbers currently manage their business through some combination of memory, a paper notebook, and personal text messages. This causes:

Double-booked appointments

Delayed or forgotten invoices, hurting cash flow

No-shows from customers who forgot appointments

No organized customer history (repeat customers treated like strangers)

No way to weigh competing job requests (value, loyalty, urgency) at a glance

Business texts mixed into a personal phone, unorganized and unsearchable

3. Target User

Primary: solo, independent plumbers — high per-job value means high willingness to pay ($30–100+/month) since a missed job costs real money, not just inconvenience.

Explicitly not the target for V1: teams/multi-employee plumbing businesses, other trades (electricians, HVAC — possible future expansion once the core product is proven with plumbers specifically).

4. Core Principles (established through design discussion)

Honesty over flattery — no inflated claims, accurate pricing language, no misleading payout options

Zero friction for customers — no app download, no account, ever. Customers interact only via a web form and normal SMS.

The plumber stays in control — the app never books, prices, or decides anything automatically without his confirmation. AI suggests; it does not decide.

Narrow before broad — one trade, one clean core loop, before adding team features, other trades, or extra complexity.

5. Functional Requirements

5.1 Authentication

Plumber signs up with business name, username, password

Passwords stored as bcrypt hashes, never in plain text

Login issues a session token (30-day expiry)

Signup auto-generates a unique public booking link/slug (e.g. flowline.app/r/marcus-plumbing) tied to that plumber

5.2 Customer Intake (public, no login required)

Customer scans a QR code or taps a link → opens a simple web form (not an app)

Required fields: name, phone, address, description of issue, urgency (Today / This week / Whenever)

Submission is matched to an existing customer by phone number, or creates a new customer record

Lands in the plumber's app as a pending request — never auto-booked

5.3 Pending Requests / Job Comparison View

Each pending request displayed as a card showing:

Customer name and loyalty tier (see 5.4)

Job description (AI-cleaned summary)

Suggested price (AI-suggested from similar past jobs, editable)

Urgency tag

Time since request was submitted

Plumber can Accept (choose date, time, confirm price → job becomes Scheduled) or Decline

Accepting triggers an automatic confirmation SMS to the customer

5.4 Customer Loyalty Tagging (automatic)

Every customer automatically tagged based on lifetime spend and visit frequency:

🔴 Top client (highest spend/frequency)

🟡 Regular

⚪ New / one-time

Tags are computed automatically — never manually set by the plumber

5.5 Scheduling

Calendar/schedule view grouped by day, each job shows date, time, customer, description

"Mark done" triggers a two-step completion:

Plumber marks work complete

Customer receives a soft-confirmation text ("Reply YES to confirm"); auto-confirms after 24–48 hrs if no response

This protects both sides without blocking the plumber's payment on the customer's response

5.6 Messaging / Chat

All SMS communication with a given customer is unified into one thread inside the app, replacing scattered personal-phone texts

Automatic messages sent at key moments: job confirmed, job marked done, payment link sent

Plumber can also send free-form messages from the chat thread

AI auto-detection: incoming customer texts are scanned — if a message reads as a new job request (not just a reply), it automatically creates a new pending request card; ordinary replies remain plain chat messages

Two-way: customer replies (via real SMS) flow back into the same thread, not just outbound messages

5.7 Payments

Plumber connects a real payout method (bank account or debit card) via a Stripe Connect onboarding flow

Plumber sends a payment link via SMS once ready to bill (separate, deliberate action from "mark done")

Customer pays via a hosted, branded payment page — no app, no account

On successful payment (via webhook, not polling):

Job marked paid

Amount added to the plumber's in-app balance

Customer's lifetime spend and visit count updated (feeds loyalty tagging)

Plumber can withdraw balance to bank (free, 1–2 days) or debit card (instant, small fee) on demand

5.8 Payments Tab / Earnings

Total earnings, filterable by All time / This month / This week / Today

Running list of completed, paid jobs

Live balance card with a Withdraw action

Payout method status and management link

5.9 Customers Tab

List of all saved customers, sorted by lifetime spend

Shows loyalty tag, phone, lifetime spend, visit count

Access point to that customer's chat thread

6. Business Model

Free tier:

No monthly fee

Transaction fees: ~10% on each customer payment received, plus ~3–5% on withdrawal to bank/card

Reduced feature set (exact limitation TBD — leaning toward removing automatic day-before SMS reminders rather than a hard usage cap, to avoid double-penalizing free users)

Paid tier ($29–49/month, pricing may tier further by usage volume):

0% transaction fees — plumber keeps full payment amount

Full feature set including automatic reminders

Rationale: removes signup friction (no upfront cost), and the fee structure is designed so a moderately active plumber naturally saves money by upgrading — this is the intended conversion mechanism, not a hard paywall.

Note: exact fee percentages and free-tier limitations are directional, not final — should be validated against real usage once live.

7. Non-Functional Requirements

Security: passwords hashed (bcrypt), all plumber data scoped strictly to that plumber's login — no cross-account data access possible

No stored bank/card numbers in-app: all sensitive payment data handled exclusively by Stripe; the app never stores or sees raw account/card numbers

Reliability: payment status updates must be event-driven (Stripe webhook), not manually refreshed, so balance and job status are always accurate

Simplicity for a non-technical customer base: zero app downloads or accounts required on the customer side, ever

8. Technical Architecture (summary)

Backend: Node.js + Express

Database: PostgreSQL (via Supabase)

Payments: Stripe Connect (Express accounts) — handles onboarding, payment links, payouts, and compliance

SMS: Twilio — outbound messages plus inbound webhook for two-way chat

Frontend: two static surfaces — plumber dashboard (authenticated) and public customer request form (no auth)

Hosting: backend on Render (or equivalent always-on host), frontend on Netlify (or equivalent static host)

(Full schema, API routes, and setup instructions exist as separate delivered code/documentation.)

9. Explicitly Out of Scope for V1

Team/multi-employee support (job assignment to helpers)

Support for trades other than plumbing

Native mobile app (customer or plumber side) — web-based only for now

Route optimization / address grouping

Recurring/annual maintenance auto-scheduling

In-app customer-facing account or login of any kind

Marketplace / new-customer discovery features

10. Open Questions / To Be Decided

Exact free-tier feature limitation(s) beyond transaction fees

Final transaction fee percentages (10% / 3–5% are working assumptions, not validated)

Whether photo attachments (before/after job photos) belong in V1 or V2

Estimate-to-invoice conversion flow (quote first, convert to final invoice later)

Emergency/after-hours pricing toggle

11. Success Criteria for V1

A real plumber can sign up, receive a request via the public form, accept it, get paid, and withdraw funds — entirely within the app, without manual workarounds

Zero app download required at any point for the customer

No cross-plumber data leakage under any circumstance

Core loop (request → accept → complete → paid → withdrawn) functions end-to-end on real, deployed infrastructure — not just in a local prototype

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5ee4d800-fea9-4d75-a0e7-c03ccc36f1ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
