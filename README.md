# Student Tool Hub

Student Tool Hub is a lightweight web platform for students to discover useful free AI tools and other online platforms.

It includes:
- User signup/login with Supabase Auth
- Public tool feed with search and filters
- Tool detail pages with ratings and reviews
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
4. Run `supabase/seed.sql`.
5. Create your first account from the app (`/register`).
6. In SQL Editor, run:

```sql
select public.set_admin_by_email('your-email@example.com');
```

Now your account can open `/admin` and moderate submissions.

## Data Flow

- Users submit tools from `/submit` into `tool_submissions` (status `pending`).
- Admin approves in `/admin`.
- `approve_submission()` publishes directly into `tools` with status `published`.
- Home feed reads from `tools` where status is `published`.
- Feed updates automatically via Supabase Realtime.

## Database Files

- `supabase/schema.sql` - tables, triggers, functions, RLS policies
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
