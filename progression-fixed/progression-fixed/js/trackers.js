/* Trackers module: built-in/custom definitions, local-date logs, and pure tracker calculations. */
export const TRACKER_COLORS = {blue:'var(--ac)',yellow:'var(--xp)',red:'var(--er)',green:'var(--ok)',purple:'var(--lv)',orange:'#f2965c'};
export const BUILTIN_TRACKERS = []; // no default trackers: every tracker is user-created
const clone = value => JSON.parse(JSON.stringify(value));
const validTypes = new Set(['number','count','duration','rating']);
export function normalizeTrackers(state) {
  const saved = Array.isArray(state.trackers) ? state.trackers : [];
  const logs = state.trackerLogs && typeof state.trackerLogs === 'object' ? state.trackerLogs : {};
  const hasLogs = id => Object.keys(logs).some(k => k.startsWith(id + '|'));
  // One-time cleanup: drop the old default Sleep/Water trackers if they have no logged data. Ones with data are kept as normal, deletable trackers.
  state.trackers = saved.filter(t => t && typeof t.id === 'string' && !(t.builtin && !hasLogs(t.id))).map(t => ({...t, builtin:false, archived:!!t.archived}));
  state.trackerLogs = state.trackerLogs && typeof state.trackerLogs === 'object' ? state.trackerLogs : {};
  return state;
}
export function getTracker(state, id) { return (state.trackers || []).find(t => t.id === id); }
export function activeTrackers(state) { return (state.trackers || []).filter(t => !t.archived); }
export function trackerGoal(state, tracker) { return tracker && Number.isFinite(+tracker.dailyGoal) ? +tracker.dailyGoal : 0; }
export function trackerUnit(state, tracker) { return tracker?.unit || ''; }
export const WATER_GLASS_ML = 250;
export function displayValue(state, tracker, value) { return tracker?.id === 'water' && trackerUnit(state,tracker)==='glasses' ? Number(value||0)/WATER_GLASS_ML : Number(value||0); }
export function displayGoal(state, tracker) { return displayValue(state,tracker,trackerGoal(state,tracker)); }
export function inputValue(state, tracker, value) { return tracker?.id === 'water' && trackerUnit(state,tracker)==='glasses' ? Number(value||0)*WATER_GLASS_ML : Number(value||0); }
export function trackerValue(state, id, date) { return Number(state.trackerLogs?.[`${id}|${date}`]?.value) || 0; }
export function writeTrackerValue(state, tracker, date, value) {
  const n = Math.max(0, Number(value) || 0);
  if (n !== 0 && tracker.type === 'rating' && (n < 1 || n > 5)) throw new Error('Rating must be between 1 and 5.');
  const key = `${tracker.id}|${date}`;
  if (n === 0) delete state.trackerLogs[key];
  else state.trackerLogs[key] = {trackerId:tracker.id,date,value:n};
  return n;
}
export function addWater(state, tracker, date, amount) { return writeTrackerValue(state, tracker, date, trackerValue(state,tracker.id,date) + Math.max(0,Number(amount)||0)); }
export function dateRows(dateRange, state, tracker, date) { return dateRange.map(date => ({date,value:trackerValue(state,tracker.id,date)})); }
export function average(rows) { const values=rows.filter(r=>r.value>0).map(r=>r.value); return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; }
export function goalHit(state, tracker, date) { const value=trackerValue(state,tracker.id,date), goal=trackerGoal(state,tracker); return goal>0 && (tracker.direction==='lower' ? value>0 && value<=goal : value>=goal); }
export function goalHitCount(state, tracker, dates) { return dates.filter(d=>goalHit(state,tracker,d)).length; }
export function currentStreak(state, tracker, dates) { let count=0; for(let i=dates.length-1;i>=0;i--){if(goalHit(state,tracker,dates[i])) count++; else break;} return count; }
export function bestStreak(state, tracker, dates) { let run=0,best=0; for(const date of dates){if(goalHit(state,tracker,date)){run++;best=Math.max(best,run)}else run=0} return best; }
export function sleepDebt(state, tracker, dates) { const goal=trackerGoal(state,tracker); return dates.reduce((sum,date)=>{const v=trackerValue(state,tracker.id,date);return v>0?sum+Math.max(0,goal-v):sum},0); }
export function normalizeValue(state, tracker, value) { const goal=trackerGoal(state,tracker); if(!(goal>0)) return value; if(value<=0) return 0; const pct=tracker.direction==='lower'?goal/value*100:value/goal*100; return Math.max(0,Math.min(150,pct)); }
export function validateTrackerDefinition(t) { return !!t && typeof t.id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(t.id) && typeof t.name==='string' && t.name.trim().length>0 && validTypes.has(t.type) && ['higher','lower'].includes(t.direction) && ['blue','yellow','red','green','purple','orange'].includes(t.color) && (t.dailyGoal===undefined || (Number.isFinite(Number(t.dailyGoal)) && Number(t.dailyGoal)>=0)); }
export function makeCustomTracker(fields) { const name=String(fields.name||'').trim(); if(!name) throw new Error('Name your tracker.'); const type=validTypes.has(fields.type)?fields.type:'number'; const goal=fields.dailyGoal===''||fields.dailyGoal===undefined?0:Math.max(0,Number(fields.dailyGoal)||0); return {id:`t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,name,unit:String(fields.unit||'').trim().slice(0,24),type,dailyGoal:goal,direction:fields.direction==='lower'?'lower':'higher',color:TRACKER_COLORS[fields.color]?fields.color:'blue',builtin:false,archived:false}; }
export function compareSeries(state, trackers, dates) { return trackers.slice(0,3).map((tracker,index) => ({name:tracker.name,color:['blue','yellow','red'][index],points:dates.map(date => { const raw=trackerValue(state,tracker.id,date); return {date,value:raw?normalizeValue(state,tracker,raw):0,display:raw?`${Math.round(normalizeValue(state,tracker,raw))}%`:''}; })})); }
export function cloneTracker(t) { return clone(t); }
