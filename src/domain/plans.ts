import type {Exercise,Plan,PlanItem,Stage,Workout} from './types.ts';
import {routineForDate,setTarget,uid} from './program.ts';
import {addDays,monday,today,weekday} from './calendar.ts';
export {addDays,weekday,monday,today,firstTrainingDate,dateLabel} from './calendar.ts';
export {uid} from './program.ts';
export function schedule(plan:Plan){const start=monday(plan.startDate),dates:string[]=[];for(let i=0;i<plan.weeks*7;i++){const date=addDays(start,i);if(date>=plan.startDate&&plan.days.includes(weekday(date)))dates.push(date);}return dates;}
export function nextTraining(plan:Plan,workouts:Workout[],date=today()){const done=new Set(workouts.filter(w=>w.planId===plan.id&&w.completed).map(w=>w.scheduledDate)),pending=schedule(plan).filter(d=>!done.has(d));return pending.find(d=>d>=date)??pending[0]??null;}
export function weekIndex(plan:Plan,date:string){return Math.max(0,Math.min(plan.weeks-1,Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(monday(plan.startDate)+'T12:00:00Z'))/604800000)));}
export function createItem(exercise:Exercise):PlanItem{return {id:uid(),exerciseId:exercise.id,mode:exercise.countable?'reps':'time',seconds:exercise.defaultSeconds,reps:exercise.defaultReps,weight:0,sets:exercise.defaultSets??1,rest:exercise.defaultRest??45,effort:exercise.category==='warmup'||exercise.category==='recovery'?2:5};}
export function insertItem(items:PlanItem[],item:PlanItem,index:number){return [...items.slice(0,index),item,...items.slice(index)];}
export function moveItem(items:PlanItem[],id:string,index:number){const source=items.findIndex(i=>i.id===id);if(source<0)return items;const result=items.filter(i=>i.id!==id);result.splice(Math.max(0,Math.min(result.length,index-(source<index?1:0))),0,items[source]);return result;}
export function buildStages(plan:Plan,library:Exercise[],date=plan.startDate):Stage[]{
  const routine=routineForDate(plan,date),stages:Stage[]=[],covered=new Set<string>();
  const work=(item:PlanItem,n:number):Stage=>{
    const exercise=library.find(e=>e.id===item.exerciseId);if(!exercise)throw new Error('计划中包含无法识别的动作。');
    const target=setTarget(item,n);
    return {id:`${item.id}:${n}`,itemId:item.id,name:exercise.name,category:exercise.category,mode:item.mode,seconds:target.seconds,reps:target.reps,weight:target.weight,effort:target.effort,set:n+1,sets:item.sets,cue:exercise.cue,equipment:exercise.equipment,isRest:false,...(item.setTargets?{setKind:target.kind}:{})};
  };
  const rest=(stage:Stage,seconds:number,id:string,name='组间休息'):Stage=>({...stage,id,name,category:'recovery',mode:'time',seconds,reps:0,weight:0,effort:1,cue:'放松呼吸，为下一环节做好准备。',equipment:'无需器械',isRest:true});
  for(const item of routine.items){
    if(covered.has(item.id))continue;
    const group=routine.groups?.find(g=>g.itemIds[0]===item.id);
    if(group){
      const members=group.itemIds.map(id=>routine.items.find(i=>i.id===id)!);
      members.forEach(i=>covered.add(i.id));
      for(let round=0;round<group.rounds;round++){
        for(let index=0;index<members.length;index++){
          const stage={...work(members[index],round),groupKind:group.kind,round:round+1,rounds:group.rounds};stages.push(stage);
          if(index<members.length-1&&group.transitionRest>0)stages.push(rest(stage,group.transitionRest,`${group.id}:transition:${round}:${index}`,'动作间休息'));
          if(index===members.length-1&&round<group.rounds-1&&group.rest>0)stages.push(rest(stage,group.rest,`${group.id}:round:${round}`,'轮间休息'));
        }
      }
    }else for(let n=0;n<item.sets;n++){
      const stage=work(item,n);stages.push(stage);
      if(n<item.sets-1&&setTarget(item,n).rest>0)stages.push(rest(stage,setTarget(item,n).rest,`${item.id}:rest:${n}`));
    }
  }
  return stages;
}
export function estimateItem(item:PlanItem){return Array.from({length:item.sets},(_,i)=>{const s=setTarget(item,i);return (item.mode==='time'?s.seconds:s.reps*3)+(i<item.sets-1?s.rest:0);}).reduce((a,b)=>a+b,0);}
export function estimateStages(stages:Stage[]){return stages.reduce((n,s)=>n+(s.mode==='time'?s.seconds:s.reps*3),0);}
export function durationLabel(seconds:number){return seconds<60?`${Math.round(seconds)} 秒`:`${Math.round(seconds/60*10)/10} 分钟`;}
export function itemSummary(item:PlanItem){return item.setTargets?`${item.sets} 组 · 逐组设置`:`${item.mode==='time'?durationLabel(item.seconds):item.reps+' 次'}${item.weight>0?' · '+item.weight+' kg':''}${item.sets>1?' × '+item.sets+' 组':''}`;}
