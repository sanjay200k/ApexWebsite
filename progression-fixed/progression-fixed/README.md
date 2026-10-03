# Progression PWA

Vanilla JavaScript PWA: goals, daily missions, XP, streaks, achievements, Winter Arc, plus Sleep / Water / Custom Trackers.

## Run
Serve over HTTP (ES modules + service worker need it):
`python -m http.server 4173` then open http://localhost:4173/ (PyCharm: right-click index.html > Open in > Browser).
After updating, hard refresh (Ctrl+Shift+R) or clear site data.

## Data
- localStorage key `pp_bk`, state version v2; tracker fields `trackers` / `trackerLogs` are optional, so old backups import fine.
- Daily snapshots in `pp_snapshots` (last 7). Supabase credentials are stored separately and never exported.

## Tests
`node tests/logic.test.mjs`

## Manual checklist
Log sleep 5h/7h/9h on 3 days, add water + undo, create a custom tracker, open Compare, export, clear, import, reload offline.

## Supabase setup
```sql
create table progression_state (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table progression_state enable row level security;
create policy "own row select" on progression_state for select using (auth.uid() = user_id);
create policy "own row insert" on progression_state for insert with check (auth.uid() = user_id);
create policy "own row update" on progression_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Enable email provider + add site URL to redirect list in Supabase dashboard.

## Sync merge
`mergeStates(local, cloud)` in `js/state.js` unions logs/goals/missions/trackers; newer `lastModified` wins conflicts. Wire into app.js pull path instead of whole-state replace.
