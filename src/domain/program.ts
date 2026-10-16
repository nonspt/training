import type {DayPlan,Plan,PlanGroup,PlanItem,SetTarget,State} from './types.ts';
import {weekday} from './calendar.ts';
export const uid=()=>crypto.randomUUID();
export const hasAdvancedPlan=(plan:Plan)=>!!plan.dayPlans||!!plan.groups?.length||plan.items.some(i=>!!i.setTargets);
export const hasAdvancedState=(state:Pick<State,'plans'|'draft'|'workouts'>)=>state.plans.some(hasAdvancedPlan)||!!state.draft?.dayName||!!state.draft?.stages.some(s=>s.groupKind||s.setKind)||state.workouts.some(w=>!!w.dayName);

export function setTarget(item:PlanItem,index:number):SetTarget {
  return item.setTargets?.[index]??{kind:'work',seconds:item.seconds,reps:item.reps,weight:item.weight,rest:item.rest,effort:item.effort};
}
export function resizeSets(item:PlanItem,sets:number):PlanItem {
  return {...item,sets,...(item.setTargets?{setTargets:Array.from({length:sets},(_,i)=>({...setTarget(item,Math.min(i,item.sets-1))}))}:{})};
}
export function routineForDate(plan:Plan,date=plan.startDate):Pick<DayPlan,'name'|'items'|'groups'> {
  return plan.dayPlans?.find(d=>d.day===weekday(date))??plan.dayPlans?.[0]??{name:'',items:plan.items,groups:plan.groups};
}
export function cloneRoutine<T extends Pick<DayPlan,'items'|'groups'>>(routine:T):T {
  const ids=new Map(routine.items.map(i=>[i.id,uid()]));
  return {...structuredClone(routine),items:routine.items.map(i=>({...structuredClone(i),id:ids.get(i.id)!})),...(routine.groups?{groups:routine.groups.map(g=>({...g,id:uid(),itemIds:g.itemIds.map(id=>ids.get(id)!)}))}:{})};
}
// A group is a single reorderable block. Removing members dissolves invalid groups.
export function cleanGroups(items:PlanItem[],groups:PlanGroup[]=[]):PlanGroup[] {
  const ids=new Set(items.map(i=>i.id));
  return groups.map(g=>({...g,itemIds:g.itemIds.filter(id=>ids.has(id))})).filter(g=>g.itemIds.length>=2);
}
export function routineBlocks(items:PlanItem[],groups:PlanGroup[]=[]):PlanItem[][] {
  const covered=new Set<string>(),blocks:PlanItem[][]=[];
  for(const item of items){
    if(covered.has(item.id))continue;
    const group=groups.find(g=>g.itemIds[0]===item.id);
    const block=group?group.itemIds.map(id=>items.find(i=>i.id===id)!):[item];
    block.forEach(i=>covered.add(i.id));blocks.push(block);
  }
  return blocks;
}
export function insertionBoundary(items:PlanItem[],groups:PlanGroup[],index:number){
  const group=groups.find(g=>g.itemIds.slice(1).includes(items[index]?.id));
  return group?items.findIndex(i=>i.id===group.itemIds.at(-1))+1:index;
}
export function moveRoutine(items:PlanItem[],groups:PlanGroup[],id:string,index:number){
  const source=routineBlocks(items,groups).find(block=>block.some(i=>i.id===id));if(!source)return items;
  const target=items[index],targetBlock=target?routineBlocks(items,groups).find(b=>b.some(i=>i.id===target.id)):undefined;
  if(targetBlock===source||targetBlock?.some(i=>source.some(s=>s.id===i.id)))return items;
  const remaining=items.filter(i=>!source.some(s=>s.id===i.id));
  const at=targetBlock?remaining.findIndex(i=>i.id===targetBlock[0].id):remaining.length;
  return [...remaining.slice(0,at),...source,...remaining.slice(at)];
}
