import {EFFORT_MIN,EFFORT_MAX} from '../../domain/training-targets.ts';
import type {Exercise,PlanItem} from '../../domain/types.ts';
import {bodyPartNames} from '../../domain/types.ts';
import {RangeField} from './RangeField.tsx';
import {SegmentedChoice} from './SegmentedChoice.tsx';
import {Icon} from './Icon.tsx';
import {resizeSets,setTarget} from '../../domain/program.ts';
import {SetTargetEditor} from './SetTargetEditor.tsx';

export function PlanItemSettings({item,exercise,index,total,grouped=false,onChange,onReorder,onDone}:{item:PlanItem;exercise:Exercise;index:number;total:number;grouped?:boolean;onChange:(patch:Partial<PlanItem>)=>void;onReorder:(direction:number)=>void;onDone:()=>void}){
  const hasSets=exercise.category!=='warmup'&&exercise.category!=='recovery';
  return <div className="item-settings">
    <div className="item-setting-scroll internal-scroll">
      {hasSets&&<div className="set-mode-row"><SegmentedChoice label="动作设置方式" value={item.setTargets?'individual':'uniform'} options={[{value:'uniform',label:'统一设置'},{value:'individual',label:'逐组设置'}]} onChange={value=>{
        if(value==='individual')onChange({setTargets:Array.from({length:item.sets},(_,n)=>({...setTarget(item,n)}))});
        else if(window.confirm('改用第1组参数统一所有组？保存计划后生效。')){const target=setTarget(item,0);onChange({seconds:target.seconds,reps:target.reps,weight:target.weight,rest:target.rest,effort:target.effort,setTargets:undefined});}
      }}/>{grouped&&<span className="tiny-note">{item.sets} 轮 · 休息由组合设置</span>}</div>}
      <div className="target-setting-row">
        {exercise.countable&&<SegmentedChoice label={exercise.name+'计量'} value={item.mode} options={[{value:'reps',label:'按次数'},{value:'time',label:'按时长'}]} onChange={mode=>onChange({mode})}/>}
        {item.setTargets?(hasSets&&!grouped&&<RangeField label="组数" sliderLabel={'调节'+exercise.name+'组数'} unit="组" value={item.sets} min={1} max={10} onChange={sets=>onChange(resizeSets(item,sets))}/>):item.mode==='time'?<RangeField label="时长" sliderLabel={'调节'+exercise.name+'时长'} unit="秒" value={item.seconds} min={5} max={exercise.category==='cardio'?1800:600} step={5} onChange={seconds=>onChange({seconds})}/>:<RangeField label="次数" sliderLabel={'调节'+exercise.name+'次数'} unit="次" value={item.reps} min={1} max={50} onChange={reps=>onChange({reps})}/>}
      </div>
      {item.setTargets?<SetTargetEditor item={item} exercise={exercise} grouped={grouped} onChange={onChange}/>:<div className="setting-grid">
        {exercise.weighted&&<RangeField label="重量" sliderLabel={'调节'+exercise.name+'重量'} unit="kg" value={item.weight} min={0} max={exercise.maxWeight??50} step={.5} onChange={weight=>onChange({weight})}/>}
        {hasSets&&!grouped&&<RangeField label="组数" sliderLabel={'调节'+exercise.name+'组数'} unit="组" value={item.sets} min={1} max={10} onChange={sets=>onChange(resizeSets(item,sets))}/>}
        {hasSets&&!grouped&&item.sets>1&&<RangeField label="组间休息" sliderLabel={'调节'+exercise.name+'组间休息'} unit="秒" value={item.rest} min={0} max={180} step={5} onChange={rest=>onChange({rest})}/>}
        {exercise.category==='cardio'&&<RangeField label="主观用力" sliderLabel={'调节'+exercise.name+'主观用力'} unit={'/'+EFFORT_MAX} value={item.effort} min={EFFORT_MIN} max={EFFORT_MAX} onChange={effort=>onChange({effort})}/>}
      </div>}
      <details className="movement-details" key={exercise.id}>
        <summary><Icon name="chevron" size={16}/>动作参考</summary>
        <p className="tiny-note">{exercise.equipment} · {exercise.bodyParts?.map(part=>bodyPartNames[part]).join(' / ')}</p>
        {exercise.weighted&&<p className="tiny-note">{exercise.weightNote}</p>}
        <p className="movement-cue">{exercise.cue}</p>
        <a className="movement-source" href={exercise.source} target="_blank" rel="noreferrer">动作参考</a>
      </details>
    </div>
    <div className="item-edit-footer">
      <button className="icon-button" aria-label={'上移'+exercise.name} disabled={index===0} onClick={()=>onReorder(-1)}><Icon name="up" size={16}/></button>
      <button className="icon-button" aria-label={'下移'+exercise.name} disabled={index===total-1} onClick={()=>onReorder(1)}><Icon name="down" size={16}/></button>
      <button className="text-button" onClick={onDone}><Icon name="check" size={16}/>完成此动作</button>
    </div>
  </div>;
}
