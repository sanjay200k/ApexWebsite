/* State module: validates v2 backups, preserves old data, and keeps credentials out of backups. */
import { localDateKey } from './engine.js';
export const STATE_VERSION = 2;
export const BACKUP_KEY = 'pp_bk';
export const SNAPSHOT_KEY = 'pp_snapshots';
export const SUPABASE_CONFIG_KEY = 'pp_supabase_config';
export const isDate = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d=new Date(`${value}T00:00:00`); return !Number.isNaN(d.getTime()) && d.getFullYear()===Number(value.slice(0,4)) && d.getMonth()+1===Number(value.slice(5,7)) && d.getDate()===Number(value.slice(8,10)); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || data.v !== STATE_VERSION) return {ok:false, reason:'Backup must be a Progression v2 file.'};
  if (!Array.isArray(data.goals) || !Array.isArray(data.missions) || !data.logs || typeof data.logs !== 'object') return {ok:false, reason:'Backup collections are malformed.'};
  const ids = new Set();
  for (const goal of data.goals) {
    if (!goal || typeof goal.id !== 'string' || ids.has(goal.id) || typeof goal.name !== 'string' || !isDate(goal.start) || !isDate(goal.end) || goal.end < goal.start) return {ok:false, reason:'A goal has invalid identity, name, or dates.'};
    ids.add(goal.id);
  }
  const missionIds = new Set();
  const allowedTypes = new Set(['check','qty','dur']);
  for (const mission of data.missions) {
    if (!mission || typeof mission.id !== 'string' || missionIds.has(mission.id) || !ids.has(mission.goalId) || typeof mission.name !== 'string' || !allowedTypes.has(mission.type) || !finite(Number(mission.target)) || Number(mission.target) < 0 || !finite(Number(mission.xp)) || Number(mission.xp) < 0 || !isDate(mission.start) || (mission.end && !isDate(mission.end))) return {ok:false, reason:'A mission has invalid type, number, date, or goal reference.'};
    missionIds.add(mission.id);
  }
  for (const [key, log] of Object.entries(data.logs)) {
    if (!log || typeof log !== 'object' || !missionIds.has(log.missionId) || !isDate(log.date) || !finite(Number(log.value)) || Number(log.value) < 0 || key !== `${log.missionId}|${log.date}` || (log.at !== undefined && (!finite(Number(log.at)) || Number(log.at) <= 0))) return {ok:false, reason:'A mission log has invalid date, value, timestamp, or reference.'};
  }
  if (data.trackers !== undefined) {
    if (!Array.isArray(data.trackers)) return {ok:false, reason:'Tracker definitions must be an array.'};
    const trackerIds = new Set();
    for (const tracker of data.trackers) {
      if (!tracker || typeof tracker.id !== 'string' || trackerIds.has(tracker.id) || !/^[a-zA-Z0-9_-]{1,80}$/.test(tracker.id) || typeof tracker.name !== 'string' || !tracker.name.trim() || !['number','count','duration','rating'].includes(tracker.type) || !['higher','lower'].includes(tracker.direction) || !['blue','yellow','red','green','purple','orange'].includes(tracker.color) || (tracker.dailyGoal !== undefined && (!finite(Number(tracker.dailyGoal)) || Number(tracker.dailyGoal)<0))) return {ok:false, reason:'A tracker definition is invalid.'};
      trackerIds.add(tracker.id);
    }
    if (data.trackerLogs !== undefined) {
      if (!data.trackerLogs || typeof data.trackerLogs !== 'object' || Array.isArray(data.trackerLogs)) return {ok:false, reason:'Tracker logs must be an object.'};
      for (const [key, log] of Object.entries(data.trackerLogs)) if (!log || typeof log !== 'object' || !trackerIds.has(log.trackerId) || !isDate(log.date) || key !== `${log.trackerId}|${log.date}` || !finite(Number(log.value)) || Number(log.value)<0) return {ok:false, reason:'A tracker log has an invalid id, date, key, or value.'};
    }
  } else if (data.trackerLogs !== undefined) return {ok:false, reason:'Tracker logs require tracker definitions.'};
  for (const row of [...(data.xp||[]), ...(data.stats||[])]) if (!row || !isDate(row.date) || !finite(Number(row.amount ?? row.amt))) return {ok:false, reason:'An XP or stat row has invalid date or number.'};
  return {ok:true};
}
export function getSupabaseConfig() { try { const value = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
export function setSupabaseConfig(config) { try { localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({url:config.url||'', key:config.key||'', email:config.email||'', enabled:!!config.enabled})); } catch {} }
export function sanitizeState(state) {
  const copy = JSON.parse(JSON.stringify(state || {}));
  if (copy.settings) delete copy.settings.supabase;
  return copy;
}
export function readSnapshots() { try { const value = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
export function writeSnapshot(state) {
  try {
    const day = localDateKey(new Date());
    const all = readSnapshots();
    all[day] = {savedAt: Date.now(), state: sanitizeState(state)};
    for (const key of Object.keys(all).sort().slice(0,-7)) delete all[key];
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all));
  } catch {}
}

/* Per-key merge: union of logs/entities, newer lastModified wins on key conflict. Deletions are not tracked (deleted items can return). */
export function mergeStates(local, cloud) {
  const [older, newer] = String(local?.lastModified || '') >= String(cloud?.lastModified || '') ? [cloud, local] : [local, cloud];
  const merged = JSON.parse(JSON.stringify(newer || {}));
  for (const k of ['logs','trackerLogs']) if (older?.[k]) merged[k] = {...older[k], ...(newer?.[k] || {})};
  for (const k of ['goals','missions','trackers']) if (Array.isArray(older?.[k])) { const ids = new Set((newer?.[k] || []).map(x => x.id)); merged[k] = [...(newer?.[k] || []), ...older[k].filter(x => !ids.has(x.id))]; }
  return merged;
}
