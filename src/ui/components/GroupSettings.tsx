import type {PlanGroup} from '../../domain/types.ts';
import {RangeField} from './RangeField.tsx';
export function GroupSettings({group,onChange,onSplit,onDone}:{group:PlanGroup;onChange:(patch:Partial<PlanGroup>)=>void;onSplit:()=>void;onDone:()=>void}){
  return <div className="group-settings" aria-label="动作组合设置">
    <div className="setting-grid">
      <RangeField label="轮数" sliderLabel="调节组合轮数" unit="轮" min={1} max={10} value={group.rounds} onChange={rounds=>onChange({rounds})}/>
      <RangeField label="轮间休息" sliderLabel="调节轮间休息" unit="秒" min={0} max={180} step={5} value={group.rest} onChange={rest=>onChange({rest})}/>
      <RangeField label="动作间休息" sliderLabel="调节动作间休息" unit="秒" min={0} max={180} step={5} value={group.transitionRest} onChange={transitionRest=>onChange({transitionRest})}/>
    </div>
    <div className="group-setting-actions"><button className="text-button danger" onClick={onSplit}>拆分为独立动作</button><button className="text-button" onClick={onDone}>完成组合</button></div>
  </div>;
}
