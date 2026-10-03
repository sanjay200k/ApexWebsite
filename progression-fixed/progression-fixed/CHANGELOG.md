# Progression update changelog

1. **Comeback achievement** — `js/engine.js`, `js/app.js`: the first completion is excluded; comeback requires an earlier completion followed by a missed scheduled day, excluding rest and freeze-protected days.
2. **Early-bird / night-shift timestamps** — `js/app.js`, `js/engine.js`, `js/state.js`: completed logs now store `at`; achievements classify each log timestamp; old logs remain valid but are not counted for time achievements.
3. **Rest-day perfect bonus** — `js/engine.js`, `js/app.js`: shared `isPerfect()` rejects rest days and empty schedules; settle and recompute use it.
4. **Streak freeze scan** — `js/engine.js`, `js/app.js`: chronological, insertion-order-independent single-gap allocation; yesterday can be protected; displayed bank reflects actual available freezes.
5. **Rest-day limit / local dates** — `js/engine.js`: checks six days before and after using local calendar keys, with no UTC conversion.
6. **Achievement filter** — `js/app.js`: category options are generated from the actual achievement definitions.
7. **Arc rest styling** — `styles.css`, `js/app.js`: calm blue-grey `.arc-day.rest` style and Rest legend item added.
8. **Backup credential safety** — `js/state.js`, `js/app.js`, `js/supabase.js`: Supabase URL/key/email move to `pp_supabase_config`; exports, snapshots, imports, and sync payloads exclude credentials.
9. **Supabase pull / last-write-wins** — `js/app.js`, `js/supabase.js`, `js/state.js`: boot and post-login sync pull the row, compare `lastModified` / `updated_at`, validate cloud state, and confirm before replacing newer local data.
10. **Token refresh / retry backoff** — `js/supabase.js`, `js/app.js`: expired JWTs refresh through Supabase; 401/403 stop retries and show “Sign in again”; other failures back off at 5s, 15s, 45s, then up to 5 minutes.
11. **Install icons** — `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`: added navy/gold-star icons and metadata for Chrome/iOS installability.
12. **Service-worker freshness** — `sw.js`: bumped to `progression-v4`; navigation, JS, and CSS are network-first, while icons/fonts are cache-first.
13. **Dead Claude/cloud block** — `js/app.js`: removed the `claude.use(...)` boot path and legacy DB/COL dependency; local-first behavior remains.

## Tests

```bash
node tests/logic.test.mjs
```

The test suite covers comeback rules, timestamp-based time achievements, perfect-day behavior, freeze ordering, yesterday protection, rest-day limits in Asia/Kolkata and America/New_York, category coverage, credential stripping, and old v2 data.

## Caveat

Supabase email magic-link authentication still requires the project’s email provider and redirect configuration to be enabled in the Supabase dashboard. The client handles the returned access/refresh-token URL fragment and persists the session locally.


## Tracker feature follow-up

14. **Optional tracker state migration** — `js/state.js`, `js/app.js`: added optional `trackers` and `trackerLogs` fields without changing `STATE_VERSION` or `pp_bk`; old backups receive Sleep and Water built-ins on load.
15. **Local-date tracker engine** — `js/engine.js`, `js/state.js`, `js/app.js`: added `localDateKey()` and used it for new tracker code and snapshots; date validation now rejects calendar-invalid dates such as February 31.
16. **Sleep Monitor** — `js/trackers.js`, `js/app.js`: 4–10 hour quick logs, 0.5-step custom values, past-date correction, configurable sleep goal, average/debt/best/worst/streak metrics, goal line, and rolling average chart.
17. **Water Tracker** — `js/trackers.js`, `js/app.js`: +250/+500/+750 quick adds, custom amounts, one-session undo, daily goal, goal-hit/streak metrics, and ml/glasses display conversion while retaining raw ml storage.
18. **Custom Trackers** — `js/trackers.js`, `js/app.js`: custom name/unit/type/goal/direction/color, +1/+5 count controls, date-specific numeric entries, edit/archive/delete confirmation, and safe text rendering.
19. **Glossy trend charts** — `js/charts.js`, `styles.css`: responsive pure SVG charts with gridlines, axis labels, gaps, goal lines, area fills, radial glossy points, tooltips via SVG titles, rolling average, and reduced-motion handling.
20. **Compare view and offline cache** — `js/app.js`, `sw.js`: up to three trackers normalized to percentage of goal in blue/yellow/red; `js/trackers.js` added to the existing `progression-v4` shell cache.
21. **Tracker regression tests and checklist** — `tests/logic.test.mjs`, `README.md`: added localDateKey, averages, streak, tracker logging, validation with/without tracker fields, and manual migration/offline checklist.

## Fix pass
22. Rating clear: `writeTrackerValue` allows 0 for ratings.
23. `sw.js` v5: cache only `response.ok`; install no longer fails on one missing file.
24. `sleepDebt` skips unlogged days.
25. `normalizeValue` inverts for `direction:'lower'` so compare chart higher = better.
26. `charts.js`: area fill built per contiguous run; tap/focus tooltips.
27. `state.js`: `mergeStates` per-key merge (hook into app.js pull).
28. `index.html`: CSP meta, `crossorigin` gstatic preconnect.
29. Icons: star shrunk inside ring.
30. README: Supabase SQL + RLS.
