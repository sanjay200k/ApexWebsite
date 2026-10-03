/* Engine module: pure progression rules shared by the app and Node tests. */
export const localDate = value => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const localDateKey = localDate;
export const parseLocalDate = date => new Date(`${date}T00:00:00`);
export const addDays = (date, amount) => {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + amount);
  return localDate(d);
};
export const dateRange = (from, to) => {
  const rows = [];
  for (let d = from; d <= to; d = addDays(d, 1)) rows.push(d);
  return rows;
};
export const rankForLevel = level => level >= 30 ? 'S' : level >= 20 ? 'A' : level >= 12 ? 'B' : level >= 7 ? 'C' : level >= 3 ? 'D' : 'E';
export const ACHIEVEMENT_CATEGORIES = ['Missions','Streaks','Perfect days','Hours','Levels','Progress','Goals','Time','Recovery'];

// Fixes the rest-day limit: inspect the full 13-day window using local calendar keys.
export function canAddRestDay(days, date) {
  for (const key of dateRange(addDays(date, -6), addDays(date, 6))) {
    if (key !== date && days?.[key]) return false;
  }
  return true;
}

export const freezeAllowance = bestStreak => Math.floor(Math.max(0, bestStreak) / 14);

// Fixes freeze allocation: scan chronological single-day gaps without feeding freezes into best-streak calculation.
export function freezeDatesForHistory(activeDates, restDates = {}, today, bestStreak) {
  const active = new Set(activeDates);
  const earliest = [...active].sort()[0];
  if (!earliest) return {};
  const earned = freezeAllowance(bestStreak);
  const protectedDates = {};
  let spent = 0;
  for (const day of dateRange(earliest, addDays(today, -1))) {
    if (spent >= earned || active.has(day) || restDates[day]) continue;
    const isYesterday = day === addDays(today, -1);
    if (!active.has(addDays(day, -1)) || (!active.has(addDays(day, 1)) && !isYesterday)) continue;
    protectedDates[day] = true;
    spent++;
  }
  return protectedDates;
}

// Fixes perfect-day inconsistency: rest and empty scheduled days never count as perfect.
export function isPerfect(day, { scheduledCount, completedCount, rest }) {
  return !rest && scheduledCount > 0 && completedCount === scheduledCount;
}

// Fixes first-day comeback unlocks: require earlier completion and a real missed scheduled day.
export function comebackCount(completedDates, scheduledDates, restDates = {}, freezeDates = {}) {
  const completed = new Set(completedDates);
  const ordered = [...completed].sort();
  if (!ordered.length) return 0;
  let count = 0;
  for (const day of ordered.slice(1)) {
    let prior = addDays(day, -1);
    let missed = false;
    while (prior >= ordered[0]) {
      if (completed.has(prior)) break;
      if (scheduledDates.has(prior) && !restDates[prior] && !freezeDates[prior]) { missed = true; break; }
      prior = addDays(prior, -1);
    }
    if (missed) count++;
  }
  return count;
}

// Fixes clock-based achievements: classify each completion by its own local log timestamp.
export function timeMetrics(logs, missionById) {
  let earlyBird = 0;
  let lateNight = 0;
  for (const log of logs) {
    if (!log.at || !missionById(log.missionId)) continue;
    const hour = new Date(log.at).getHours();
    if (hour < 8) earlyBird++;
    if (hour >= 22) lateNight++;
  }
  return { earlyBird, lateNight };
}

export const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
