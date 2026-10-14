import type {Exercise,Plan,PlanItem,Stage,Workout} from './types.ts';
export const uid=()=>crypto.randomUUID();
// Date-only arithmetic uses UTC to avoid DST changing calendar days.
export function addDays(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function weekday(date:string){return new Date(date+'T12:00:00Z').getUTCDay();}
export function monday(date:string){return addDays(date,-((weekday(date)+6)%7));}
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function firstTrainingDate(days:number[],from=today()){for(let i=0;i<7;i++){const d=addDays(from,i);if(days.includes(weekday(d)))return d;}return from;}
export function schedule(plan:Plan){const start=monday(plan.startDate),dates:string[]=[];for(let i=0;i<plan.weeks*7;i++){const date=addDays(start,i);if(date>=plan.startDate&&plan.days.includes(weekday(date)))dates.push(date);}return dates;}
export function nextTraining(plan:Plan,workouts:Workout[],date=today()){const done=new Set(workouts.filter(w=>w.planId===plan.id&&w.completed).map(w=>w.scheduledDate)),pending=schedule(plan).filter(d=>!done.has(d));return pending.find(d=>d>=date)??pending[0]??null;}
export function weekIndex(plan:Plan,date:string){return Math.max(0,Math.min(plan.weeks-1,Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(monday(plan.startDate)+'T12:00:00Z'))/604800000)));}
export function createItem(exercise:Exercise):PlanItem{return {id:uid(),exerciseId:exercise.id,mode:exercise.countable?'reps':'time',seconds:exercise.defaultSeconds,reps:exercise.defaultReps,weight:0,sets:exercise.defaultSets??1,rest:exercise.defaultRest??45,effort:exercise.category==='warmup'||exercise.category==='recovery'?2:5};}
export function insertItem(items:PlanItem[],item:PlanItem,index:number){return [...items.slice(0,index),item,...items.slice(index)];}
export function moveItem(items:PlanItem[],id:string,index:number){const source=items.findIndex(i=>i.id===id);if(source<0)return items;const result=items.filter(i=>i.id!==id);result.splice(Math.max(0,Math.min(result.length,index-(source<index?1:0))),0,items[source]);return result;}
export function buildStages(plan:Plan,library:Exercise[]):Stage[]{return plan.items.flatMap(item=>{const exercise=library.find(e=>e.id===item.exerciseId);if(!exercise)throw new Error('计划中包含无法识别的动作。');return Array.from({length:item.sets},(_,n)=>{const stage:Stage={id:`${item.id}:${n}`,itemId:item.id,name:exercise.name,category:exercise.category,mode:item.mode,seconds:item.seconds,reps:item.reps,weight:item.weight,effort:item.effort,set:n+1,sets:item.sets,cue:exercise.cue,equipment:exercise.equipment,isRest:false};return n<item.sets-1&&item.rest>0?[stage,{...stage,id:`${item.id}:rest:${n}`,name:'组间休息',category:'recovery' as const,mode:'time' as const,seconds:item.rest,reps:0,weight:0,effort:1,cue:'放松呼吸，为下一组做好准备。',equipment:'无需器械',isRest:true}]:[stage];}).flat();});}
export function estimateItem(item:PlanItem){return (item.mode==='time'?item.seconds:item.reps*3)*item.sets+item.rest*(item.sets-1);}
export function durationLabel(seconds:number){return seconds<60?`${Math.round(seconds)} 秒`:`${Math.round(seconds/60*10)/10} 分钟`;}
export function itemSummary(item:PlanItem){return `${item.mode==='time'?durationLabel(item.seconds):item.reps+' 次'}${item.weight>0?' · '+item.weight+' kg':''}${item.sets>1?' × '+item.sets+' 组':''}`;}
export function dateLabel(date:string){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(new Date(date+'T12:00:00+08:00'));}
