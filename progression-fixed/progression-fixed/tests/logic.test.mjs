import assert from 'node:assert/strict';
import {
  addDays, canAddRestDay, comebackCount, freezeDatesForHistory,
  isPerfect, timeMetrics, ACHIEVEMENT_CATEGORIES, localDateKey
} from '../js/engine.js';
import { sanitizeState, validateBackup } from '../js/state.js';
import { normalizeTrackers, getTracker, writeTrackerValue, average, currentStreak, makeCustomTracker } from '../js/trackers.js';

const scheduled = dates => new Set(dates);

// One completion is progress, not a comeback.
assert.equal(comebackCount(['2026-01-01'], scheduled(['2026-01-01','2026-01-02'])), 0);
// A completed day after a missed scheduled day is a comeback.
assert.equal(comebackCount(['2026-01-01','2026-01-03'], scheduled(['2026-01-01','2026-01-02','2026-01-03'])), 1);
// Rest and freeze-protected gaps do not count as comebacks.
assert.equal(comebackCount(['2026-01-01','2026-01-03'], scheduled(['2026-01-01','2026-01-02','2026-01-03']), {'2026-01-02':true}), 0);
assert.equal(comebackCount(['2026-01-01','2026-01-03'], scheduled(['2026-01-01','2026-01-02','2026-01-03']), {}, {'2026-01-02':true}), 0);

// Early/late metrics use each log's own timestamp, not the current clock.
const morning = new Date('2026-01-02T07:30:00').getTime();
const night = new Date('2026-01-02T22:30:00').getTime();
const metrics = timeMetrics([{missionId:'m1',at:morning},{missionId:'m2',at:night},{missionId:'m3'}], id => ({id}));
assert.deepEqual(metrics, {earlyBird:1, lateNight:1});

// Rest days and empty days cannot be perfect; a full normal day is perfect.
assert.equal(isPerfect('2026-01-02', {scheduledCount:1, completedCount:1, rest:true}), false);
assert.equal(isPerfect('2026-01-02', {scheduledCount:0, completedCount:0, rest:false}), false);
assert.equal(isPerfect('2026-01-02', {scheduledCount:2, completedCount:2, rest:false}), true);
// The daily bonus formula therefore agrees for settle and recompute.
const bonus = (day, count, done, rest) => isPerfect(day,{scheduledCount:count,completedCount:done,rest}) ? 100 : 0;
assert.equal(bonus('2026-01-02',1,1,false), bonus('2026-01-02',1,1,false));
assert.equal(bonus('2026-01-02',1,1,true), 0);

// Freeze allocation is chronological and independent of insertion order.
const active = ['2026-01-01','2026-01-03','2026-01-05','2026-01-07','2026-01-09','2026-01-11','2026-01-13','2026-01-15','2026-01-17','2026-01-19','2026-01-21','2026-01-23','2026-01-25','2026-01-27','2026-01-29'];
const a = freezeDatesForHistory(active, {}, '2026-01-30', 28);
const b = freezeDatesForHistory([...active].reverse(), {}, '2026-01-30', 28);
assert.deepEqual(a, b);
assert.deepEqual(Object.keys(a).slice(0,2), ['2026-01-02','2026-01-04']);
// A missed yesterday is protectable even before today is completed.
assert.equal(freezeDatesForHistory(['2026-01-28'], {}, '2026-01-30', 14)['2026-01-29'], true);

// Rest limit is symmetric and uses local date keys.
assert.equal(canAddRestDay({'2026-01-10':true}, '2026-01-04'), false);
assert.equal(canAddRestDay({'2026-01-10':true}, '2026-01-16'), false);
assert.equal(canAddRestDay({'2026-01-10':true}, '2026-01-17'), true);
for (const tz of ['Asia/Kolkata','America/New_York']) {
  process.env.TZ = tz;
  assert.equal(canAddRestDay({'2026-01-10':true}, '2026-01-04'), false, tz);
  assert.equal(addDays('2026-01-10', 7), '2026-01-17', tz);
}

// Every achievement category used by the app is represented in the filter contract.
assert.deepEqual(ACHIEVEMENT_CATEGORIES, ['Missions','Streaks','Perfect days','Hours','Levels','Progress','Goals','Time','Recovery']);

// Exports and snapshots must not contain Supabase credentials.
const exported = sanitizeState({v:2,settings:{supabase:{url:'https://x',key:'SECRET',email:'a@b.test'},restDays:{}},goals:[],missions:[],logs:{},xp:[],stats:[]});
assert.equal(JSON.stringify(exported).includes('SECRET'), false);
assert.equal('supabase' in exported.settings, false);

// Old saved data without timestamps and lastModified remains valid.
const old = {v:2,goals:[{id:'g1',name:'Goal',start:'2026-01-01',end:'2026-01-03'}],missions:[{id:'m1',goalId:'g1',name:'Mission',type:'check',target:1,xp:10,start:'2026-01-01'}],logs:{'m1|2026-01-01':{id:'m1|2026-01-01',missionId:'m1',date:'2026-01-01',value:1}},xp:[],stats:[]};
assert.equal(validateBackup(old).ok, true);

// New tracker fields remain optional and old backups still validate.
assert.equal(localDateKey(new Date('2026-01-02T01:00:00')), '2026-01-02');
const trackerState = normalizeTrackers({v:2,settings:{},trackers:[],trackerLogs:{}});
const sleep = getTracker(trackerState,'sleep');
writeTrackerValue(trackerState,sleep,'2026-01-01',8);
writeTrackerValue(trackerState,sleep,'2026-01-02',7);
writeTrackerValue(trackerState,sleep,'2026-01-03',8);
assert.equal(average([{value:8},{value:0},{value:10}]), 9);
assert.equal(currentStreak(trackerState,sleep,['2026-01-01','2026-01-02','2026-01-03']), 1);
const custom = makeCustomTracker({name:'Pages <safe>',unit:'pages',type:'count',dailyGoal:5,direction:'higher',color:'red'});
trackerState.trackers.push(custom);
writeTrackerValue(trackerState,custom,'2026-01-03',5);
const trackerBackup={...old,trackers:trackerState.trackers,trackerLogs:trackerState.trackerLogs};
assert.equal(validateBackup(trackerBackup).ok, true);
assert.equal(validateBackup({...trackerBackup,trackerLogs:{'sleep|2026-01-03':{trackerId:'sleep',date:'2026-01-03',value:-1}}}).ok, false);
assert.equal(validateBackup({...trackerBackup,trackerLogs:{'sleep|2026-01-03':{trackerId:'sleep',date:'2026-02-31',value:8}}}).ok, false);

console.log('logic.test.mjs: all assertions passed');
