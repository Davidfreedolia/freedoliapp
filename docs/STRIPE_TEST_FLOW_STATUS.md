# Stripe Test Mode — Functional Status

## Flow Verified

1. User logged in
2. Manage billing clicked
3. JWT validated in edge function
4. Portal fallback to checkout if no customer
5. Stripe session created (test mode)
6. Redirect to Stripe Checkout
7. Return URL → app

## Current Mode
Stripe: TEST
Live mode: Activated but not configured.

## Known Decisions
- No copying from test to live.
- Statement descriptor planned: FREEDOLIAPP.COM
- Go-live blocked until pricing + webhook LIVE configured.
