# WholeChild

Holistic development & monitoring platform for learners at [Aitsa! aftercare](https://www.aitsa.org/).

The app is a static SPA (Vite + React + TypeScript + Tailwind + shadcn/ui) backed by Supabase for auth and data, deployed to GitHub Pages.

## Features (v0.1)

- Email/password sign-in (Supabase Auth) with admin/teacher roles.
- Learner CRUD with grade & status filters and search.
- Per-learner profile, baseline assessment intake (literacy, numeracy, social, emotional, physical), and ongoing progress entries.
- Filterable dashboard with KPIs and charts (grade distribution, baseline domain averages, gender breakdown).
- Row-level security so teachers only edit learners they're assigned to; only admins can create/delete learners.

## Tech stack

| Concern | Choice |
| --- | --- |
| App | React 18 + TypeScript |
| Tooling | Vite |
| Styling | Tailwind CSS + shadcn/ui (in-tree) |
| Routing | React Router (`HashRouter` for GitHub Pages) |
| Data | TanStack Query + Supabase JS |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Hosting | GitHub Pages (Actions workflow) |

## Local setup

1. **Clone & install**
   ```bash
   git clone https://github.com/jandredippenaar/WholeChild.git
   cd WholeChild
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com>.

3. **Apply the schema.** Paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor and run it.

4. **Configure env.** Copy `.env.example` to `.env` and fill in your project URL and anon key:
   ```bash
   cp .env.example .env
   ```

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open <http://localhost:5173>.

6. **Sign up** the first user (Authentication → Users → invite or use the app's sign-up flow if you've enabled it). Then promote that user to admin by running the snippet in `supabase/migrations/0002_seed_admin.sql`.

## Deployment

The repo is wired up to deploy via GitHub Actions on every push to `main`:

1. In the GitHub repo, **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` and the workflow will publish to `https://jandredippenaar.github.io/WholeChild/`.

> The Vite `base` is set to `/WholeChild/` in production. If you fork or rename the repo, update `vite.config.ts` accordingly.

## Project structure

```
src/
  components/
    ui/            shadcn/ui primitives (in-tree, edit freely)
    layout/        AppShell, Sidebar, UserMenu
    learners/      LearnerForm
  pages/           Login, Dashboard, Learners, LearnerDetail, NotFound
  lib/
    supabase.ts    supabase-js client
    auth.tsx       AuthProvider + useAuth
    queries.ts     TanStack Query hooks for learners/assessments/progress
    utils.ts       cn(), age helpers, GRADES/GENDERS/ASSESSMENT_DOMAINS
  types/db.ts      Hand-written Supabase row/insert types
supabase/migrations/
  0001_init.sql    Schema, RLS policies, signup trigger
  0002_seed_admin.sql  Snippet to promote a user to admin
```

## Roles

| Role | Read | Write |
| --- | --- | --- |
| **admin** | everything | learners, assignments, all assessments & progress |
| **teacher** | everything | learners they're assigned to; their own assessments & progress entries |

New users default to `teacher`. Promote to admin via SQL (see `0002_seed_admin.sql`).

## Working with this codebase via Claude Code / AI

The codebase is intentionally conventional and small:
- Routes are declared in `src/App.tsx`.
- Sidebar items are declared in `src/components/layout/Sidebar.tsx`.
- Add a new entity by adding a table to the migration, types in `src/types/db.ts`, query hooks in `src/lib/queries.ts`, and a page under `src/pages/`.
- shadcn/ui components live in `src/components/ui/` and are meant to be edited in place.
