# EH Chat Leads · Asha Dashboard

A realtime daily dashboard for **EzyHelpers** chatbot leads, backed by Supabase
(`chatbot_sessions` table). Built with Next.js (App Router) + TypeScript, ready
to push to GitHub and deploy on Vercel.

## What it shows

- **KPIs** — sessions today (vs yesterday), leads completed today, emailed to
  team, last 7 days, all-time total, and all-time completion rate.
- **Daily volume** — bar chart of sessions per day for the last 14 days (today
  highlighted in amber).
- **Lead funnel** — cumulative pipeline: New → Engaged → Qualified → Lead
  complete → Emailed to team. Each stage counts every session that reached *at
  least* that far, so the funnel descends.
- **Top requested roles** — normalised (maid/Maid/Cook/cook collapsed into one).
- **Live feed** — newest sessions first, with stage, lead type, name, phone,
  area, role, job type, message count, and landing page. New rows flash in.
- **Today filter**, **privacy blur** (hides names/phones until hover — for
  shared screens), **pause**, and **manual refresh**.

All days are bucketed in **Asia/Kolkata** so "today" matches the team's day.

## Security — read this before deploying

This table contains **real phone numbers and names** for ~500 people. The app is
deliberately built so the Supabase key is **read server-side only**, inside
Next.js Route Handlers (`/app/api/*`). The key is **never** shipped to the
browser, so a loose Row Level Security (RLS) policy does not expose PII through
this dashboard.

- The server read key is `SUPABASE_KEY` — **no** `NEXT_PUBLIC_` prefix.
- The realtime feature (optional) uses a separate public anon key
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Realtime only *notifies* of changes; the
  app then re-fetches authoritative data through the server API. Realtime still
  respects RLS on the channel.
- **Recommendation:** keep RLS enabled on `chatbot_sessions` and protect the
  deployed dashboard URL itself (e.g. Vercel password protection or an auth
  layer), since anyone who can open the page can see the leads it renders.

`.csv` and all `.env*` files are git-ignored so you never commit data or keys.

## Local setup

```bash
# 1. install
npm install

# 2. configure env
cp .env.example .env.local
#    then edit .env.local with your values

# 3. run
npm run dev
# open http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Your Supabase project URL. |
| `SUPABASE_KEY` | yes | Server-side read key. The publishable key works **if** RLS grants the anon/public role SELECT; otherwise use a **service-role** key (safe here — server-side only). |
| `SUPABASE_TABLE` | no | Defaults to `chatbot_sessions`. |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Enables realtime. Same as `SUPABASE_URL`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Enables realtime. Your project's **anon** key. |

Without the two `NEXT_PUBLIC_*` vars, the dashboard still works — it falls back
to polling every 15 seconds (the status pill shows "polling 15s" instead of
"realtime").

## Enabling true realtime (optional)

1. In Supabase → **Database → Replication**, add `chatbot_sessions` to the
   `supabase_realtime` publication (or enable Realtime for the table).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Redeploy. The status pill turns green ("realtime") and the feed updates the
   instant a new session is written.

## Push to GitHub

```bash
git init
git add .
git commit -m "EH Chat Leads realtime dashboard"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next`, every `.env*` file, and
`*.csv`.

## Deploy on Vercel

1. Push to GitHub (above).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset auto-detects **Next.js**. No build settings to change.
4. Under **Environment Variables**, add at minimum `SUPABASE_URL` and
   `SUPABASE_KEY` (and the two `NEXT_PUBLIC_*` vars if you want realtime).
5. **Deploy.**
6. Strongly consider enabling **Vercel Authentication / password protection** on
   the project so the lead data isn't publicly reachable.

## How a "lead" is staged

Derived from row flags, highest stage reached wins:

| Stage | Condition |
| --- | --- |
| New session | session started, nothing actionable captured |
| Engaged | ≥ 4 messages but no contact details |
| Qualified | has a name or phone, not yet complete |
| Lead complete | `lead_complete = true` |
| Emailed to team | `lead_emailed = true` |

In the current data every completed lead was also emailed, so **Complete** and
**Emailed** show the same count — that's accurate, not a bug.

## Project structure

```
app/
  api/sessions/route.ts   server read: recent sessions for the feed
  api/stats/route.ts      server read: KPIs, daily buckets, funnel, categories
  page.tsx                dashboard (client): fetch + realtime + render
  layout.tsx, globals.css
components/
  DailyChart.tsx          14-day bar chart (Recharts)
  Pipeline.tsx            cumulative funnel
  CategoryBars.tsx        top requested roles
  LeadFeed.tsx            live table
lib/
  types.ts                row + payload types
  leadLogic.ts            stage derivation, normalisation, TZ helpers
  supabaseServer.ts       server-only client
  supabaseBrowser.ts      browser client (realtime only)
```

## Notes / next steps

- Phone values arrive as `8861048336.0` in the export; the feed strips the
  trailing `.0`.
- The funnel and category breakdowns use a 14-day window for relevance; KPIs mix
  today/yesterday/7-day/all-time as labelled.
- To add a per-session detail drawer (full chat transcript), the `messages`
  column already holds the JSON — wire a modal off the feed rows.
