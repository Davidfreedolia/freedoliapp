# Security Decisions Log

## Edge Functions

- Gateway JWT verification disabled.
- Manual validation via:
  supabaseUser.auth.getUser()
- Role validation via org_memberships table.
- Only owner/admin can create billing sessions.

Reason:
Greater control and compatibility with Supabase Edge runtime.
