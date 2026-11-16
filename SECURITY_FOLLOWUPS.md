# Security follow-ups (dashboard-only)

These cannot be done from the repo. Complete them in the provider dashboards.

- [ ] Vercel: set `PUBLIC_TURNSTILE_ENABLED` (and the site key) in the production environment; redeploy. See `TURNSTILE_SETUP.md`.
- [ ] Supabase Auth > Attack Protection: enable CAPTCHA (Turnstile secret) and review rate limits for sign-in, sign-up, OTP and password reset.
- [ ] Supabase Auth > Password security: enable leaked-password protection (HaveIBeenPwned check).
- [ ] Supabase Auth > Providers > Email: confirm "Confirm email" is enforced, so unconfirmed accounts cannot sign in.
