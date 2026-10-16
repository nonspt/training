import {useState} from 'react';
import type {Exercise,PlanItem,SetTarget} from '../../domain/types.ts';
import {setTarget} from '../../domain/program.ts';
import {RangeField} from './RangeField.tsx';
import {EFFORT_MAX} from '../../domain/training-targets.ts';
type Field='seconds'|'reps'|'weight'|'rest'|'effort';
export function SetTargetEditor({item,exercise,grouped,onChange}:{item:PlanItem;exercise:Exercise;grouped:boolean;onChange:(patch:Partial<PlanItem>)=>void}){
  const [selection,setSelection]=useState<{index:number;field:Field}>({index:0,field:item.mode==='time'?'seconds':'reps'});
  const index=Math.min(selection.index,item.sets-1),target=setTarget(item,index);
  const field=selection.field==='seconds'||selection.field==='reps'?(item.mode==='time'?'seconds':'reps'):selection.field;
  const labels:Record<Field,string>={seconds:'时长',reps:'次数',weight:'重量',rest:'休息',effort:'用力'};
  const units:Record<Field,string>={seconds:'秒',reps:'次',weight:'kg',rest:'秒',effort:'/'+EFFORT_MAX};
  const maximum:Record<Field,number>={seconds:exercise.category==='cardio'?1800:600,reps:50,weight:exercise.maxWeight??50,rest:180,effort:EFFORT_MAX};
  const fields:Field[]=[item.mode==='time'?'seconds':'reps',...(exercise.weighted?['weight' as const]:[]),...(!grouped?['rest' as const]:[]),...(exercise.category==='cardio'?['effort' as const]:[])];
  function update(patch:Partial<SetTarget>){onChange({setTargets:Array.from({length:item.sets},(_,n)=>({...setTarget(item,n),...(n===index?patch:{})}))});}
  return <div className="set-target-editor">
    <div className="set-table internal-scroll" style={{'--set-fields':fields.length} as React.CSSProperties} role="group" aria-label="逐组参数">
      <div className="set-table-head"><span>组次</span><span>类型</span>{fields.map(f=><span key={f}>{labels[f]}</span>)}</div>
      {Array.from({length:item.sets},(_,n)=>{const s=setTarget(item,n);return <div className={'set-table-row '+(index===n?'editing':'')} key={n} style={{'--set-fields':fields.length} as React.CSSProperties}>
        <span>{n+1}</span><button type="button" aria-label={'第'+(n+1)+'组类型'} aria-pressed={s.kind==='warmup'} onClick={()=>{setSelection({index:n,field});onChange({setTargets:Array.from({length:item.sets},(_,i)=>({...setTarget(item,i),...(i===n?{kind:s.kind==='warmup'?'work' as const:'warmup' as const}:{})}))});}}>{s.kind==='warmup'?'热身':'正式'}</button>
        {fields.map(f=><button type="button" key={f} aria-label={'调节第'+(n+1)+'组'+labels[f]} aria-pressed={index===n&&field===f} onClick={()=>setSelection({index:n,field:f})}>{s[f]}<small>{units[f]}</small></button>)}
      </div>;})}
    </div>
    <RangeField label={'第'+(index+1)+'组'+labels[field]} sliderLabel={'设置第'+(index+1)+'组'+labels[field]} value={target[field]} unit={units[field]} min={field==='seconds'?5:field==='reps'||field==='effort'?1:0} max={maximum[field]} step={field==='seconds'||field==='rest'?5:field==='weight'?.5:1} onChange={value=>update({[field]:value})}/>
  </div>;
}
