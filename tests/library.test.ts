import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises,findExercise} from '../src/content/exercises.ts';
import {libraryGroups} from '../src/content/library-layouts.ts';
import {getLibraryGroups} from '../src/domain/exercise-library.ts';
import {createItem,buildStages} from '../src/domain/plans.ts';
import {bodyPartNames,emptyState} from '../src/domain/types.ts';
import type {Plan,LibraryType} from '../src/domain/types.ts';
import {validateItem,validateState,parseBackup} from '../src/domain/validation.ts';
import {newSession} from '../src/domain/session.ts';
const types:LibraryType[]=['aerobic','strength'];
const ids=(type:LibraryType)=>libraryGroups[type].flatMap(group=>group.exerciseIds);
function plan(items:string[]):Plan{const now=new Date().toISOString();return {id:'catalog-plan',name:'动作库兼容验证',type:'strength',weeks:4,days:[1,3,5],startDate:'2026-10-14',items:items.map(id=>createItem(findExercise(id))),createdAt:now,updatedAt:now,version:1};}
test('Catalog has unique IDs, valid groups, metadata, source URLs and default parameters',()=>{assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);for(const exercise of exercises){assert.ok(exercise.bodyParts?.length,exercise.id);assert.ok(exercise.bodyParts.every(part=>part in bodyPartNames));assert.ok(['bodyweight','equipment'].includes(exercise.equipmentKind!));assert.ok(/^https:\/\/(www\.|blog\.|trainer\.)?(acefitness\.org|nasm\.org|nhs\.uk|heart\.org)\//.test(exercise.source),exercise.source);assert.doesNotThrow(()=>validateItem(createItem(exercise)),exercise.id);}for(const type of types){assert.equal(new Set(ids(type)).size,ids(type).length);for(const id of ids(type))assert.ok(findExercise(id),id);}});
test('Only two curated libraries retain every visible action and classify the former mixed actions',()=>{
  assert.deepEqual(Object.keys(libraryGroups),types);
  assert.equal(ids('aerobic').length,42);assert.equal(ids('strength').length,84);
  assert.notDeepEqual(ids('aerobic'),ids('strength'));
  const all=new Set(types.flatMap(ids));assert.equal(all.size,116);
  for(const e of exercises){if(e.id!=='band')assert.ok(all.has(e.id),e.id);assert.ok(!e.types.includes('mixed'));for(const type of types)assert.equal(e.types.includes(type),ids(type).includes(e.id),e.id);}
  for(const id of ['burpee','step-burpee','mountain-climber','skater-step','squat-jump','box-jump','battle-rope']){assert.ok(ids('aerobic').includes(id));assert.ok(!ids('strength').includes(id));}
  for(const id of ['squat-press','kettlebell-swing','squat-curl','renegade-row','lunge-rotation','farmer-carry','suitcase-carry','bear-crawl','inchworm','step-up-balance','plank-walkup','shoulder-tap','single-leg-balance','lateral-lunge'])assert.ok(ids('strength').includes(id),id);
});
test('Saved mixed plans and their snapshots round-trip without rewriting type, order or targets',()=>{
  const p={...plan(['burpee','farmer-carry','plank-walkup','band']),type:'mixed' as const};p.items[1].weight=30;
  const state={...emptyState(),plans:[p],activePlanId:p.id,draft:newSession(p,p.startDate,buildStages(p,exercises))};
  assert.doesNotThrow(()=>validateState(state));
  assert.deepEqual(parseBackup(JSON.stringify({app:'training-follow',schemaVersion:1,exportedAt:new Date().toISOString(),state})).state,state);
});
test('Strength includes all three lifts and every major body part',()=>{assert.deepEqual(libraryGroups.strength.find(g=>g.id==='s-big-three')!.exerciseIds,['barbell-squat','barbell-bench','barbell-deadlift']);for(const part of ['chest','back','shoulders','arms','legs','glutes','core'] as const){const found=getLibraryGroups('strength',{equipment:'all',bodyPart:part,group:'all'}).flatMap(g=>g.exercises);assert.ok(found.length>=4,part);assert.ok(found.every(e=>e.bodyParts?.includes(part)));}});
test('Body/equipment/group filters intersect; no result is represented as an empty list',()=>{const found=getLibraryGroups('strength',{equipment:'equipment',bodyPart:'chest',group:'s-chest'}).flatMap(g=>g.exercises);assert.ok(found.length>=3);assert.ok(found.every(e=>e.equipmentKind==='equipment'&&e.bodyParts?.includes('chest')));assert.deepEqual(getLibraryGroups('strength',{equipment:'bodyweight',bodyPart:'chest',group:'s-big-three'}),[]);for(const type of types)for(const equipment of ['bodyweight','equipment'] as const)assert.ok(getLibraryGroups(type,{equipment,bodyPart:'all',group:'all'}).length);});
test('Original 27 IDs, targets and session snapshots remain readable including retired generic band',()=>{const legacy=['march','heel','knee','shoulder','knee-bend','easy-cycle','walk','jog','dance','cycle','treadmill','squat','pushup','lunge','bridge','weighted-squat','db-row','db-press','band','plank','bird','standing-rest','slow-walk','slow-cycle','calf-stretch','thigh-stretch','hamstring-stretch'];const p=plan(legacy),s={...emptyState(),plans:[p],activePlanId:p.id,draft:newSession(p,p.startDate,buildStages(p,exercises))};assert.doesNotThrow(()=>validateState(s));const recovered=parseBackup(JSON.stringify({app:'training-follow',schemaVersion:1,exportedAt:new Date().toISOString(),state:s}));assert.deepEqual(recovered.state,s);assert.equal(findExercise('band').name,'弹力带训练');assert.equal(findExercise('db-row').name,'单臂哑铃划船');});
test('Barbell 120kg persists through plan, generated stages, session and backup; over-limit is rejected',()=>{const p=plan(['barbell-squat','barbell-bench','barbell-deadlift']);for(const item of p.items){item.weight=120;assert.doesNotThrow(()=>validateItem(item));assert.throws(()=>validateItem({...item,weight:201}));}const stages=buildStages(p,exercises);assert.ok(stages.filter(s=>!s.isRest).every(s=>s.weight===120));const state={...emptyState(),plans:[p],activePlanId:p.id,draft:newSession(p,p.startDate,stages)};assert.doesNotThrow(()=>validateState(state));assert.equal(parseBackup(JSON.stringify({app:'training-follow',schemaVersion:1,exportedAt:new Date().toISOString(),state})).state.plans[0].items[0].weight,120);assert.throws(()=>validateItem({...createItem(findExercise('db-row')),weight:51}));});
test('Cardio interval presets generate separated work/rest stages using existing timer semantics',()=>{const p=plan(['rower-interval']);assert.equal(p.items[0].sets,4);assert.equal(p.items[0].rest,60);const stages=buildStages(p,exercises);assert.equal(stages.length,7);assert.deepEqual(stages.map(s=>s.isRest),[false,true,false,true,false,true,false]);assert.ok(stages.every(s=>s.mode==='time'));});
