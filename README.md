# Student Tool Hub

Student Tool Hub is a lightweight web platform for students to discover useful free AI tools and other online platforms.

It includes:
- User signup/login with Supabase Auth
- Public tool feed with search and filters
- Top search + side panel categories/bookmarks layout
- Tool logo/image cards with polished animations
- Tool detail pages with ratings and reviews
- Tool-page sharing for mobile apps (WhatsApp/Telegram/X/copy link)
- Optional step-by-step setup guides with images for tools needing login/API setup
- Bookmarking
- User tool submissions
- Admin moderation panel to approve/reject submissions
- Published tools appear immediately in the feed (no redeploy required)

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Supabase (Auth + Postgres + RLS)
- Vercel (deployment)

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env.local
```

3. Fill `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_ADMIN_EMAIL=you@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=your-long-random-secret
```

4. Run app

```bash
npm run dev
```

Open: `http://localhost:3000`

## Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/migrations/20260213_security_hardening.sql`.
5. Run `supabase/migrations/20260217_tool_guides_and_realtime.sql`.
6. Run `supabase/migrations/20260217_storage_avatars.sql`.
7. Run `supabase/seed.sql`.
8. Create your first account from the app (`/register`).
9. In SQL Editor, run:

```sql
select public.set_admin_by_email('your-email@example.com');
```

Now your account can open `/admin` and moderate submissions.

### Profile photo bucket commands

If you want to apply manually in SQL editor (instead of migration), run:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

Then apply these policies from `supabase/migrations/20260217_storage_avatars.sql`.

## Data Flow

- Users submit tools from `/submit` into `tool_submissions` (status `pending`).
- Admin approves in `/admin`.
- `approve_submission()` publishes directly into `tools` with status `published`.
- Home feed reads from `tools` where status is `published`.
- Feed updates automatically via Supabase Realtime.

## Database Files

- `supabase/schema.sql` - tables, triggers, functions, RLS policies
- `supabase/migrations/20260217_tool_guides_and_realtime.sql` - setup-guide tables + realtime publication wiring
- `supabase/seed.sql` - initial tools and student resources

## Deploy on Vercel

### Option A: Vercel Dashboard

1. Push this folder to GitHub.
2. Import repository in Vercel.
3. Add environment variables from `.env.local` to Vercel Project Settings.
4. Deploy.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

When prompted, login in browser and complete project linking.

### Windows automation (optional)

If you are on Windows and want a one-command setup for local + Vercel env vars:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-vercel-supabase.ps1 `
  -SupabaseUrl "https://YOUR-PROJECT-REF.supabase.co" `
  -SupabaseAnonKey "YOUR_SUPABASE_ANON_KEY" `
  -SupabaseServiceRoleKey "YOUR_SUPABASE_SERVICE_ROLE_KEY" `
  -AdminEmail "you@example.com" `
  -ProductionSiteUrl "https://your-project.vercel.app"
```

Add `-SkipAdminPromotion` if you do not want the script to call `set_admin_by_email`.

## Build Check

```bash
npm run lint
npm run build
```

Both should pass before deployment.

## Main Routes

- `/` - public feed
- `/tools/[slug]` - tool detail + reviews
- `/login` / `/register` - auth
- `/profile` - user profile
- `/bookmarks` - saved tools
- `/submit` - submit new tool
- `/admin` - moderation dashboard (admin only)

## Notes

- This project is optimized for a simple, fast interface.
- Supabase RLS policies are enabled for all core tables.
- Ratings are automatically recalculated by DB triggers when reviews change.
