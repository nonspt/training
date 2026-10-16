import type {Plan} from '../../domain/types.ts';
import {cloneRoutine} from '../../domain/program.ts';

const dayName=(day:number)=>'星期'+['日','一','二','三','四','五','六'][day];
export function DayPlanBar({plan,day,onDay,onChange}:{plan:Plan;day:number;onDay:(day:number)=>void;onChange:(plan:Plan)=>void}){
  const current=plan.dayPlans?.find(d=>d.day===day);if(!current)return null;
  function copy(from:number){
    const source=plan.dayPlans!.find(d=>d.day===from)!;
    if(!window.confirm('用'+dayName(from)+'的动作与组合替换当前方案？保存计划后生效。'))return;
    const clone=cloneRoutine(source);
    onChange({...plan,dayPlans:plan.dayPlans!.map(d=>d.day===day?{...clone,day,name:d.name}:d)});
    onDay(day);
  }
  return <div className="day-plan-bar">
    <select aria-label="当前编辑的训练日" value={day} onChange={e=>onDay(Number(e.target.value))}>
      {plan.dayPlans!.map(d=><option key={d.day} value={d.day}>{dayName(d.day)}</option>)}
    </select>
    <input aria-label="训练日方案名称" maxLength={24} value={current.name} onChange={e=>onChange({...plan,dayPlans:plan.dayPlans!.map(d=>d.day===day?{...d,name:e.target.value}:d)})}/>
    <select aria-label="复制其他训练日方案" value="" disabled={plan.dayPlans!.length<2} onChange={e=>copy(Number(e.target.value))}>
      <option value="" disabled>复制自…</option>{plan.dayPlans!.filter(d=>d.day!==day).map(d=><option key={d.day} value={d.day}>{dayName(d.day)} · {d.name}</option>)}
    </select>
  </div>;
}
