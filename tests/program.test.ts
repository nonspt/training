import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises,findExercise} from '../src/content/exercises.ts';
import type {Plan,PlanGroup} from '../src/domain/types.ts';
import {emptyState} from '../src/domain/types.ts';
import {buildStages,createItem,estimateStages} from '../src/domain/plans.ts';
import {cloneRoutine,insertionBoundary,moveRoutine,resizeSets,routineForDate,setTarget} from '../src/domain/program.ts';
import {parseBackup,validatePlan,validateState} from '../src/domain/validation.ts';
import {advance,newSession,tick,workoutFrom} from '../src/domain/session.ts';
const make=():Plan=>({id:'program',name:'分日训练',type:'strength',weeks:4,days:[1,3],startDate:'2026-10-19',items:[createItem(findExercise('squat')),createItem(findExercise('db-row')),createItem(findExercise('march'))],createdAt:'2026-10-16T00:00:00Z',updatedAt:'2026-10-16T00:00:00Z',version:1});
function grouped(kind:PlanGroup['kind']='superset'){
 const p=make();p.items=p.items.map(i=>({...i,sets:2,seconds:5,rest:60,reps:3}));
 p.groups=[{id:'group',kind,itemIds:p.items.slice(0,kind==='superset'?2:3).map(i=>i.id),rounds:2,rest:10,transitionRest:0}];return p;
}
test('Different weekdays use independently copied routines, with names retained in session and history',()=>{
 const p=make(),a=cloneRoutine({items:p.items}),b=cloneRoutine({items:[createItem(findExercise('cycle'))]});
 p.dayPlans=[{day:1,name:'力量日',...a},{day:3,name:'有氧日',...b}];
 assert.equal(routineForDate(p,'2026-10-21').name,'有氧日');
 const monday=buildStages(p,exercises,'2026-10-19'),wednesday=buildStages(p,exercises,'2026-10-21');
 assert.equal(monday[0].name,'徒手深蹲');assert.equal(wednesday[0].name,'健身车骑行');
 const s=newSession(p,'2026-10-21',wednesday);assert.equal(s.dayName,'有氧日');assert.equal(workoutFrom(s).dayName,'有氧日');assert.equal(validateState({...emptyState(),plans:[p],activePlanId:p.id,workouts:[workoutFrom(s)]}).workouts[0].dayName,'有氧日');
 assert.notEqual(a.items[0].id,p.items[0].id);a.items[0].reps=42;assert.notEqual(p.items[0].reps,42);
 assert.deepEqual(validatePlan(p),p);
});
test('Per-set warmup and work targets, rest and estimates reflect the actual chronological stages',()=>{
 const p=make();p.items=[{...p.items[1],sets:2}];const item=p.items[0];
 item.setTargets=[{...setTarget(item,0),kind:'warmup',weight:4,reps:12,rest:15},{...setTarget(item,1),kind:'work',weight:8,reps:8,rest:90}];
 const stages=buildStages(validatePlan(p),exercises);
 assert.deepEqual(stages.map(s=>[s.name,s.weight,s.reps,s.seconds,s.setKind]),[['单臂哑铃划船',4,12,item.seconds,'warmup'],['组间休息',0,0,15,'warmup'],['单臂哑铃划船',8,8,item.seconds,'work']]);
 assert.equal(estimateStages(stages),75);
 const bigger=resizeSets(item,3);assert.equal(bigger.setTargets?.[2].weight,8);assert.equal(resizeSets(bigger,1).setTargets?.length,1);
});
test('Supersets alternate actions and rest only between rounds, including optional transition rest',()=>{
 const p=grouped(),stages=buildStages(validatePlan(p),exercises),names=stages.slice(0,5).map(s=>s.name);
 assert.deepEqual(names,['徒手深蹲','单臂哑铃划船','轮间休息','徒手深蹲','单臂哑铃划船']);
 assert.deepEqual(stages.slice(0,5).map(s=>s.round),[1,1,1,2,2]);assert.equal(stages[2].seconds,10);
 p.groups![0].transitionRest=5;
 assert.deepEqual(buildStages(p,exercises).slice(0,7).map(s=>s.name),['徒手深蹲','动作间休息','单臂哑铃划船','轮间休息','徒手深蹲','动作间休息','单臂哑铃划船']);
 assert.equal(new Set(stages.map(s=>s.id)).size,stages.length);
});
test('Mixed timed and counted circuits progress, pause snapshots remain immutable and skips stay partial',()=>{
 const p=grouped('circuit'),stages=buildStages(validatePlan(p),exercises);
 assert.equal(stages.length,7);let s=newSession(p,p.startDate,stages);
 s=advance(advance(s));s=tick(s,5);assert.equal(s.index,3);s=tick(s,10);assert.equal(s.index,4);
 const snapshot=JSON.stringify(s);p.items[0].reps=49;assert.equal(JSON.stringify(s),snapshot);
 s=advance(advance(s));s=tick(s,5);assert.equal(workoutFrom(s).completed,true);
 assert.equal(workoutFrom(advance(newSession(p,p.startDate,stages),true)).completed,false);
});
test('Group copies remap all IDs; block moves and insertion never split groups',()=>{
 const p=grouped(),clone=cloneRoutine({items:p.items,groups:p.groups});
 assert.notEqual(clone.groups![0].id,p.groups![0].id);assert.deepEqual(clone.groups![0].itemIds,clone.items.slice(0,2).map(i=>i.id));
 assert.equal(insertionBoundary(p.items,p.groups!,1),2);
 const moved=moveRoutine(p.items,p.groups!,p.items[1].id,3);assert.deepEqual(moved.map(i=>i.id),[p.items[2].id,p.items[0].id,p.items[1].id]);
 assert.deepEqual(moveRoutine(p.items,p.groups!,p.items[0].id,1),p.items);
});
test('Legacy v1 state and active drafts migrate without rewriting targets; v2 backup preserves all extensions',()=>{
 const p=make(),draft=newSession(p,p.startDate,buildStages(p,exercises)),legacy={...emptyState(),schemaVersion:1,plans:[p],activePlanId:p.id,draft};
 const migrated=validateState({...legacy,schemaVersion:2});assert.equal(validateState(legacy).schemaVersion,1);assert.equal(migrated.schemaVersion,2);assert.deepEqual(migrated.draft,draft);assert.deepEqual(migrated.plans,[p]);assert.equal(legacy.schemaVersion,1);
 const advanced=grouped();advanced.items[0].setTargets=Array.from({length:2},(_,i)=>({...setTarget(advanced.items[0],i),kind:i?'work':'warmup'}));
 const state={...emptyState(),schemaVersion:2 as const,plans:[advanced],activePlanId:advanced.id,draft:newSession(advanced,advanced.startDate,buildStages(advanced,exercises))};
 assert.deepEqual(parseBackup(JSON.stringify({app:'training-follow',schemaVersion:2,exportedAt:p.updatedAt,state})).state,state);
 assert.throws(()=>parseBackup(JSON.stringify({app:'training-follow',schemaVersion:3,exportedAt:p.updatedAt,state})));
});
test('Invalid day mapping, per-set values and overlapping or reordered groups are rejected',()=>{
 const p=grouped();assert.doesNotThrow(()=>validatePlan(p));
 assert.throws(()=>validatePlan({...p,dayPlans:[{day:1,name:'力量',items:p.items}]}));
 assert.throws(()=>validatePlan({...p,groups:[...p.groups!,{...p.groups![0],id:'duplicate-members'}]}));
 assert.throws(()=>validatePlan({...p,groups:[{...p.groups![0],itemIds:[p.items[1].id,p.items[0].id]}]}));
 assert.throws(()=>validatePlan({...p,groups:[{...p.groups![0],rounds:3}]}));
 for(const patch of [{weight:1000},{reps:0},{kind:'unknown'},{rest:7},{effort:17}]){
  const item=p.items[0];assert.throws(()=>validatePlan({...p,items:[{...item,setTargets:[{...setTarget(item,0),...patch},setTarget(item,1)]},...p.items.slice(1)]}));
 }
 assert.throws(()=>validatePlan({...p,items:[{...p.items[0],setTargets:[]},...p.items.slice(1)]}));
});
