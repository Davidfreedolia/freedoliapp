# GO LIVE CHECKLIST — FREEDOLIAPP

Status: PRE-LIVE  
Date Created: 2026-02-25  

---

## 1. Stripe LIVE Configuration

- [ ] Stripe LIVE mode activated
- [ ] STRIPE_SECRET_KEY (live) configured in Supabase
- [ ] STRIPE_WEBHOOK_SECRET (live) configured
- [ ] STRIPE_PRICE_ID_CORE (live price) created
- [ ] APP_BASE_URL verified (https://freedoliapp.com)
- [ ] Live webhook endpoint created in Stripe dashboard
- [ ] Webhook signature verified in logs

---

## 2. Billing Flow Verification (LIVE)

- [ ] Checkout session returns 200
- [ ] Redirect to Stripe Checkout works
- [ ] Successful payment returns to /settings?billing=success
- [ ] stripe_customer_id stored
- [ ] stripe_subscription_id stored
- [ ] billing_status updated correctly via webhook
- [ ] Billing Portal opens correctly
- [ ] Subscription cancellation updates billing_status

---

## 3. Security Review

- [ ] JWT verification decision documented
- [ ] Manual auth via getUser() validated
- [ ] Only owner/admin can manage billing
- [ ] No exposed secrets in frontend
- [ ] CORS validated

---

## 4. Domain & Infrastructure

- [ ] freedoliapp.com primary
- [ ] www → apex redirect
- [ ] SSL valid
- [ ] Cloudflare proxy decision reviewed
- [ ] Supabase region confirmed (eu-west-1)

---

## 5. Chargeback Prevention

- [ ] Statement descriptor set to: FREEDOLIAPP.COM
- [ ] Refund policy published
- [ ] Support email visible in app
- [ ] Terms & Privacy linked
- [ ] Subscription cancellation self-service enabled

---

## 6. Financial Sanity Checks

- [ ] Test live charge performed (small amount)
- [ ] Invoice email delivered
- [ ] Stripe balance visible
- [ ] Tax configuration reviewed

---

## GO-LIVE DECISION

Approved by: __________  
Date: __________  

---
