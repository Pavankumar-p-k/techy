# Deployment Checklist

Use this file to finish startup launch quickly.

## 1) Supabase (one-time)

1. Create project in Supabase dashboard.
2. SQL Editor -> run `supabase/schema.sql`.
3. SQL Editor -> run `supabase/seed.sql`.
4. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key

## 2) Local env

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=your-long-random-secret
```

### Windows one-command setup (local env + Vercel env + redeploy)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-vercel-supabase.ps1 `
  -SupabaseUrl "https://YOUR-PROJECT-REF.supabase.co" `
  -SupabaseAnonKey "YOUR_SUPABASE_ANON_KEY" `
  -SupabaseServiceRoleKey "YOUR_SUPABASE_SERVICE_ROLE_KEY" `
  -AdminEmail "your-email@example.com" `
  -ProductionSiteUrl "https://your-project.vercel.app"
```

This script:
- writes `.env.local`
- sets Vercel env vars for `production`, `preview`, and `development`
- tries to promote `-AdminEmail` to admin via `set_admin_by_email`
- triggers a fresh production deployment

If you want to skip admin promotion call:

```powershell
... -SkipAdminPromotion
```

## 3) Make yourself admin

1. Register account at `/register`.
2. Run in Supabase SQL Editor:

```sql
select public.set_admin_by_email('your-email@example.com');
```

3. Login again and open `/admin`.

## 4) Vercel deployment

From your own interactive terminal in this folder:

```bash
npx vercel
npx vercel --prod
```

Then in Vercel project settings, add all env variables from `.env.local`.

## 5) Post-deploy checks

1. Open deployed URL.
2. Register a user.
3. Submit a tool from `/submit`.
4. Approve from `/admin`.
5. Confirm it appears on home feed instantly.
6. Add review and bookmark.

## 6) Optional on-demand revalidate hook

API route exists at `/api/revalidate`.

Send POST:
- Header: `x-revalidate-secret: REVALIDATE_SECRET`
- Body: `{ "path": "/" }`

Use this if you later add server-rendered caching flow.
