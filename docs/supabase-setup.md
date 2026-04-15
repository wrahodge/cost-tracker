# Supabase setup

Sprint 1 moves the app off in-memory `useState` onto a real Postgres
database hosted by Supabase, with a single-user auth gate (you sign
in via magic link, clients never access the site). This doc is the
one-time setup checklist.

Estimated time: **10–15 minutes**.

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and sign in (GitHub auth
   is fine — no credit card needed for the free tier).
2. Click **New project**.
3. Pick a name: `cost-tracker` (or whatever you like).
4. Set a **database password** — any random string. You won't need
   it day-to-day because we only use the anon key. Save it somewhere
   safe just in case.
5. Pick the **region closest to Sydney** — `Southeast Asia (Singapore)`
   is the lowest-latency option for AU traffic.
6. Click **Create new project** and wait ~2 minutes for it to
   provision.

## 2. Run the schema migration

1. In the project dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Paste the entire contents of `supabase/migrations/0001_mastt_schema.sql`
   from this repo.
4. Click **Run**. Should finish in ~1 second with no errors.
5. Confirm by clicking **Table Editor** in the sidebar — you should
   see 10 new tables: `projects`, `budget_categories`, `budget_groups`,
   `budget_lines`, `contracts`, `contract_sections`,
   `contract_milestones`, `variations`, `payment_claims`, `forecasts`.

## 3. Configure the auth allowlist

The RLS policy only lets the allowlisted email touch any row. The
migration in step 2 creates a locked-down `app_settings` table that
holds this email. You just insert your email into it.

1. In **SQL Editor** → **New query**.
2. Paste the following (replacing `you@example.com` with your real
   email) and click **Run**:

   ```sql
   insert into public.app_settings (key, value)
   values ('allowed_email', 'you@example.com')
   on conflict (key) do update
     set value = excluded.value,
         updated_at = now();
   ```

3. Confirm by running:

   ```sql
   select public.is_app_owner();
   ```

   This returns `false` because the SQL Editor isn't running as an
   authenticated user — that's expected. You just want the function
   to exist and run without error. Actual access checks happen later
   from the app with your real JWT.

**Why not `alter database postgres set app.allowed_email = '...'`?**
Supabase's SQL Editor runs as a non-superuser role that can't modify
database-level config. The `app_settings` table is the workaround,
and it's nicer anyway — you can change the allowed email by running
the same `insert ... on conflict` block with a new value.

## 4. Seed the Harbour View sample data

1. In **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/seed/harbour_view.sql`.
3. Click **Run**. This inserts the $17M Harbour View Apartments
   project with 2 categories, 5 groups, 11 budget lines, 4 contracts,
   4 variations, and 5 payment claims.
4. Confirm by opening **Table Editor → projects** — you should see
   one row titled "Harbour View Apartments".

The seed is **idempotent**: running it again will delete the existing
Harbour View rows first and re-insert fresh copies. Handy when you
want to reset back to known-good state.

## 5. Enable Email auth

1. **Authentication** → **Providers** → **Email** → make sure it's
   enabled (it is by default).
2. **Authentication** → **URL Configuration**:
   - **Site URL**: `https://esscostracker.pages.dev`
   - **Additional redirect URLs** (one per line):
     - `https://esscostracker.pages.dev`
     - `http://localhost:5173` (for local development)
3. Click **Save**.

Optional but recommended:

- **Authentication** → **Email Templates** → **Magic Link**: tweak
  the subject line to something like "Sign in to Cost Control".

## 6. Grab your API credentials

1. **Settings** → **API** in the sidebar.
2. Copy two values:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public key** — the long `eyJ…` string labelled `anon` `public`

   The `service_role` key is also on this page. **Never put it in
   the frontend.** It bypasses RLS. Anon key only.

## 7. Set environment variables locally

Create `.env.local` in the repo root (never committed — already
in `.gitignore`):

```bash
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_ALLOWED_EMAIL=you@example.com
```

Restart `npm run dev` after creating this file.

## 8. Set environment variables on Cloudflare Pages

1. Go to <https://dash.cloudflare.com> → **Workers & Pages** → your
   `cost-tracker` project → **Settings** → **Environment variables**.
2. Under **Production** add the same three variables:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
   - `VITE_ALLOWED_EMAIL` = your email
3. Click **Save**.
4. Trigger a redeploy — either push a commit or click **Deployments**
   → **Retry deployment** on the latest build.

## 9. First sign-in

1. Once the deploy finishes, open <https://esscostracker.pages.dev/>.
2. You'll see an email input screen — enter your email.
3. Click "Send magic link". Check your inbox (including spam) for a
   Supabase email with a "Confirm your email" link.
4. Click the link. You'll land back on the app, signed in, with the
   Harbour View Apartments data loaded from Postgres.
5. Edit a budget line or flip a variation's status → refresh the page
   → your change persists. You're live.

## Troubleshooting

**"I see the sign-in screen but never get an email."**
Check **Authentication → Users** in the Supabase dashboard —
Supabase's free tier has a tight email rate limit (4/hour by default).
If you've hit it, either wait an hour or configure a custom SMTP
provider in **Authentication → SMTP Settings**.

**"I get a magic link but it redirects me to localhost."**
Your Site URL is wrong. Go to **Authentication → URL Configuration**
and make sure Site URL is the Cloudflare Pages URL, not localhost.

**"The app loads but every table says 'Loading…' forever."**
RLS is blocking you. Either:
- You didn't run step 3 (the `alter database … set app.allowed_email`
  step), OR
- Your allowed email doesn't match the email you signed in with.
  Re-run step 3 with the exact email that shows up in
  **Authentication → Users**.

**"I see an error like `relation public.projects does not exist`."**
You didn't run the schema migration (step 2). Run it, then the seed.

**"I want to reset everything and start over."**
In SQL Editor: `drop schema public cascade; create schema public;`
Then re-run `0001_mastt_schema.sql`, step 3 (the `insert into
app_settings` block), and `harbour_view.sql` from scratch.
