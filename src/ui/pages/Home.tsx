import {useRef} from 'react';
import type {Plan,State} from '../../domain/types.ts';
import {categoryNames,typeNames} from '../../domain/types.ts';
import {buildStages,durationLabel,estimateStages,nextTraining,schedule,today,weekIndex} from '../../domain/plans.ts';
import {routineForDate} from '../../domain/program.ts';
import {exercises} from '../../content/exercises.ts';
import {Icon} from '../components/Icon.tsx';
import {FlowConnections} from '../components/FlowConnections.tsx';
import {TrainingDashboard} from './TrainingDashboard.tsx';
import './Home.css';

type HomeProps={
  state:State;busy:boolean;onCreate:()=>void;onEdit:(plan:Plan)=>void;
  onStart:(plan:Plan,date:string)=>void;onResume:()=>void;onDiscard:()=>void;
};

export function Home({state,busy,onCreate,onEdit,onStart,onResume,onDiscard}:HomeProps){
  const movements=useRef<HTMLOListElement>(null);
  const plan=state.plans.find(p=>p.id===state.activePlanId);
  const date=today();
  if(!plan)return <div className="home-empty module">
    <div className="empty-state"><span className="empty-icon"><Icon name="train" size={40}/></span>
      <h2>从一份自己的计划开始</h2><p>选择动作，安排训练日<br/>接下来的每一段，交给跟练计时</p>
      <button className="primary" onClick={onCreate}><Icon name="plus" size={20}/>创建训练计划</button>
    </div>
    <div className="empty-calendar"><Icon name="calendar" size={22}/><span>创建后，查看训练安排与跟练记录</span></div>
  </div>;

  const dates=schedule(plan);
  const doneDates=new Set(state.workouts.filter(w=>w.planId===plan.id&&w.completed).map(w=>w.scheduledDate));
  const done=dates.filter(d=>doneDates.has(d)).length;
  const focusDate=state.draft?.scheduledDate??nextTraining(plan,state.workouts,date)??plan.startDate;
  const routine=routineForDate(plan,focusDate);
  const stages=state.draft?.stages??buildStages(plan,exercises,focusDate);
  const total=estimateStages(stages);
  const estimated=durationLabel(total).split(' ');
  const movementDensity=stages.length<=3?'few':stages.length<=6?'medium':stages.length<=10?'regular':'dense';
  const completion=Math.round(done/Math.max(1,dates.length)*100);

  return <div className="home-grid home-redesign">
    <section className="module current-plan" aria-label="当前计划">
      <header className="panel-header home-plan-header">
        <p className="home-card-label">当前计划</p>
        <button className="text-button" disabled={busy||!!state.draft} onClick={onCreate}><Icon name="switch" size={18}/>更换计划</button>
      </header>
      <div className="plan-card-scroll internal-scroll home-plan-scroll" tabIndex={0} aria-label="当前计划内容">
        <div className="home-plan-identity">
          <h2 className="plan-name">{plan.name}</h2>{plan.dayPlans&&<span className="home-routine-label">{state.draft?.dayName??routine.name}</span>}
          <p className="home-plan-meta"><span>{plan.dayPlans?'分日训练':typeNames[plan.type]}</span><span>第 {weekIndex(plan,date)+1} / {plan.weeks} 周</span><span>每周 {plan.days.length} 天</span></p>
        </div>
        <div className="plan-stats home-metrics">
          <div><span>预计用时</span><strong>{estimated[0]}<small>{estimated.slice(1).join(' ')}</small></strong></div>
          <div><span>训练环节</span><strong>{stages.length}<small>项</small></strong></div>
          <div><span>完成训练</span><strong>{done}<small>/ {dates.length} 次</small></strong></div>
        </div>
        <div className="progress home-plan-progress" role="progressbar" aria-label="计划完成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{width:completion+'%'}}/></div>
        <section className="home-contents" aria-labelledby="home-movement-title">
          <div className="home-section-heading"><h3 id="home-movement-title">完整时间线</h3><span>{stages.length} 个环节</span></div>
          <ol className="outline-list home-movement-grid" ref={movements} data-density={movementDensity} aria-label="按时间顺序排列的训练动作">
            {stages.map((stage,index)=>{
              return <li className="outline-row home-movement" key={stage.id} data-flow-node={stage.id}
                aria-label={(index+1)+'，'+categoryNames[stage.category]+'，'+stage.name}>
                <span className={'home-order '+stage.category}>{String(index+1).padStart(2,'0')}</span>
                <div className="home-movement-copy"><strong>{stage.name}</strong></div>
              </li>;
            })}
            <FlowConnections hostRef={movements} layoutKey={plan.id+':'+plan.version+':'+stages.map(stage=>stage.id).join(',')} layout="grid"/>
          </ol>
        </section>
      </div>
      <footer className="plan-home-actions home-plan-footer">
        <button className="secondary" disabled={busy||!!state.draft} onClick={()=>onEdit(plan)}><Icon name="edit" size={18}/>编辑计划</button>
      </footer>
    </section>

    <TrainingDashboard key={plan.id} plan={plan} state={state} busy={busy} total={total}
      onStart={onStart} onResume={onResume} onDiscard={onDiscard}/>
  </div>;
}
