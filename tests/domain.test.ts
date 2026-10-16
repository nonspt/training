import test from 'node:test';
import assert from 'node:assert/strict';
import type {Plan} from '../src/domain/types.ts';
import {emptyState} from '../src/domain/types.ts';
import {exercises,findExercise} from '../src/content/exercises.ts';
import {addDays,buildStages,createItem,firstTrainingDate,insertItem,monday,moveItem,nextTraining,schedule,weekIndex} from '../src/domain/plans.ts';
import {advance,newSession,tick,workoutFrom} from '../src/domain/session.ts';
import {sessionProgress} from '../src/domain/session-progress.ts';
import {parseBackup,validatePlan,validateState} from '../src/domain/validation.ts';
import {EFFORT_MAX} from '../src/domain/training-targets.ts';
const plan=():Plan=>({id:'plan-1',name:'测试计划',type:'mixed',weeks:4,days:[1,3,5],startDate:'2026-10-14',items:[createItem(findExercise('march')),createItem(findExercise('squat'))],createdAt:'2026-10-14T00:00:00.000Z',updatedAt:'2026-10-14T00:00:00.000Z',version:1});

test('Effort 1–16 survives plans, immutable stages and backup round-trip; old values remain unchanged',()=>{
  assert.equal(EFFORT_MAX,16);
  for(const effort of [1,5,10,16]){
    const p=plan();p.items[0].effort=effort;
    const valid=validatePlan(p),draft=newSession(valid,valid.startDate,buildStages(valid,exercises));
    const state={...emptyState(),onboarded:true,plans:[valid],activePlanId:valid.id,draft};
    const restored=parseBackup(JSON.stringify({app:'training-follow',schemaVersion:1,exportedAt:valid.updatedAt,state}));
    assert.equal(restored.state.plans[0].items[0].effort,effort);assert.equal(restored.state.draft?.stages[0].effort,effort);
  }
  for(const effort of [0,17,1.5]){const p=plan();p.items[0].effort=effort;assert.throws(()=>validatePlan(p));}
  const p=plan(),draft=newSession(p,p.startDate,buildStages(p,exercises));draft.stages[0].effort=17;
  assert.throws(()=>validateState({...emptyState(),plans:[p],activePlanId:p.id,draft}));
});
test('Segmented progress follows timed stages, waits for count confirmation and keeps skipped completion separate',()=>{
  const p=plan();p.items[0].seconds=10;p.items[1].sets=2;p.items[1].rest=10;
  let s=newSession(p,p.startDate,buildStages(p,exercises));
  assert.deepEqual(sessionProgress(s),{percent:0,currentFraction:0});
  s=tick(s,5);assert.equal(sessionProgress(s).percent,12.5);
  s=tick(s,5);assert.equal(sessionProgress(s).percent,25);
  s=tick(s,100);assert.equal(sessionProgress(s).percent,25);assert.equal(s.index,1);
  s=advance(s);s=tick(s,5);assert.equal(sessionProgress(s).percent,62.5);
  s=advance(s,true);assert.equal(sessionProgress(s).percent,75);
  s=advance(s);assert.equal(sessionProgress(s).percent,100);assert.equal(workoutFrom(s).completed,false);
  assert.deepEqual(sessionProgress({...s,stages:[],index:0}),{percent:0,currentFraction:0});
});
test('Calendar handles Sunday, leap day, year boundary and first selected weekday',()=>{assert.equal(monday('2026-10-18'),'2026-10-12');assert.equal(addDays('2024-02-28',1),'2024-02-29');assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(firstTrainingDate([1],'2026-10-18'),'2026-10-19');assert.equal(firstTrainingDate([0],'2026-10-18'),'2026-10-18');});
test('Schedule starts on chosen day, stays within weeks, next skips completed dates',()=>{const p=plan(),dates=schedule(p);assert.equal(dates.length,11);assert.equal(dates[0],'2026-10-14');assert.equal(dates.at(-1),'2026-11-06');assert.equal(weekIndex(p,'2026-10-19'),1);assert.equal(nextTraining(p,[],'2026-10-15'),'2026-10-16');const s=newSession(p,dates[0],buildStages(p,exercises));s.index=s.stages.length;s.completed=s.stages.map(s=>s.id);assert.equal(nextTraining(p,[workoutFrom(s)],'2026-10-14'),'2026-10-16');assert.equal(nextTraining(p,[],'2026-12-01'),'2026-10-14');});
test('One-week plan created after last selected weekday still has training dates',()=>{const p=plan();p.weeks=1;p.days=[1];p.startDate=firstTrainingDate(p.days,'2026-10-18');assert.deepEqual(schedule(p),['2026-10-19']);});
test('Insertion and reordering preserve all items and config',()=>{const p=plan(),a=p.items[0],b=p.items[1],c=createItem(findExercise('plank'));assert.deepEqual(insertItem([a,b],c,1).map(i=>i.id),[a.id,c.id,b.id]);assert.deepEqual(moveItem([a,b,c],a.id,3).map(i=>i.id),[b.id,c.id,a.id]);assert.deepEqual(moveItem([a,b,c],c.id,0).map(i=>i.id),[c.id,a.id,b.id]);assert.deepEqual(moveItem([a,b],a.id,1),[a,b]);});
test('Sets generate rest only between sets, count stages do not auto finish',()=>{const p=plan();p.items[1].sets=3;p.items[1].rest=45;const stages=buildStages(p,exercises);assert.equal(stages.length,6);assert.equal(stages[2].name,'组间休息');assert.equal(stages[2].seconds,45);let s=newSession(p,'2026-10-14',stages);s=tick(s,60.4);assert.equal(s.index,1);assert.ok(Math.abs(s.stageElapsed-.4)<.001);s=tick(s,120);assert.equal(s.index,1);s=advance(s);assert.equal(s.index,2);s=tick(s,45);assert.equal(s.index,3);assert.equal(workoutFrom(s).completed,false);});
test('Skipped and partially completed sessions never mark a day complete',()=>{const p=plan(),initial=newSession(p,p.startDate,buildStages(p,exercises));const skipped=advance(advance(initial,true));assert.equal(workoutFrom(skipped).completed,false);const complete=advance(advance(initial));assert.equal(workoutFrom(complete).completed,true);assert.equal(workoutFrom(complete).confirmedReps,10);assert.equal(tick(initial,-10).elapsed,0);});
test('Invalid targets, empty training days, unknown exercises and duplicate IDs are rejected',()=>{const p=plan();assert.doesNotThrow(()=>validatePlan(p));assert.throws(()=>validatePlan({...p,days:[]}));assert.throws(()=>validatePlan({...p,days:[1,1]}));assert.throws(()=>validatePlan({...p,items:[{...p.items[0],seconds:NaN}]}));assert.throws(()=>validatePlan({...p,items:[{...p.items[0],exerciseId:'alien'}]}));assert.throws(()=>validatePlan({...p,items:[{...p.items[0],weight:10}]}));assert.throws(()=>validatePlan({...p,items:[p.items[0],p.items[0]]}));assert.throws(()=>validatePlan({...p,startDate:'2026-02-30'}));});
test('Backups are versioned, validated, and preserve a counted session snapshot',()=>{const p=plan(),state={...emptyState(),plans:[p],activePlanId:p.id,draft:newSession(p,p.startDate,buildStages(p,exercises))},backup={app:'training-follow',schemaVersion:1,exportedAt:new Date().toISOString(),state};assert.deepEqual(parseBackup(JSON.stringify(backup)).state,state);assert.throws(()=>parseBackup('bad'));assert.throws(()=>parseBackup(JSON.stringify({...backup,app:'other'})));assert.throws(()=>validateState({...state,schemaVersion:2}));assert.throws(()=>validateState({...state,activePlanId:'missing'}));assert.throws(()=>validateState({...state,draft:{...state.draft,completed:['bad-id'],index:1}}));});
