import {useState} from 'react';
import type {Plan,State} from '../../domain/types.ts';
import {addDays,dateLabel,durationLabel,monday,nextTraining,schedule,today} from '../../domain/plans.ts';
import {Icon} from '../components/Icon.tsx';

type DashboardProps={plan:Plan;state:State;busy:boolean;total:number;
  onStart:(plan:Plan,date:string)=>void;onResume:()=>void;onDiscard:()=>void};

const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const monthDay=(date:string)=>`${Number(date.slice(5,7))}月${Number(date.slice(8))}日`;
function distanceLabel(date:string,current:string){
  const days=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(current+'T12:00:00Z'))/86400000);
  return days<0?'可补练':days===0?'今天':days===1?'明天':`${days} 天后`;
}

export function TrainingDashboard({plan,state,busy,total,onStart,onResume,onDiscard}:DashboardProps){
  const [content,setContent]=useState<'schedule'|'history'>('schedule');
  const date=today(),start=monday(date),end=addDays(start,6),dates=schedule(plan);
  const workouts=state.workouts.filter(w=>w.planId===plan.id);
  const completed=new Set(workouts.filter(w=>w.completed).map(w=>w.scheduledDate));
  const next=nextTraining(plan,workouts,date),focusDate=state.draft?.scheduledDate??next;
  const thisWeek=dates.filter(d=>d>=start&&d<=end);
  const weekDone=thisWeek.filter(d=>completed.has(d)).length;
  const recorded=workouts.map(workout=>({workout,date:localDate.format(new Date(workout.finishedAt))}));
  const weekElapsed=recorded.filter(r=>r.date>=start&&r.date<=end).reduce((n,r)=>n+r.workout.elapsed,0);
  const history=recorded.sort((a,b)=>b.workout.finishedAt.localeCompare(a.workout.finishedAt)).slice(0,3);
  const pending=dates.filter(d=>!completed.has(d)&&d!==focusDate);
  const future=pending.filter(d=>d>=date);
  const upcoming=(future.length?future:pending).slice(0,3);
  const elapsed=durationLabel(weekElapsed).split(' ');
  const weekPercent=thisWeek.length?Math.round(weekDone/thisWeek.length*100):0;

  return <section className="module calendar-module training-dashboard" aria-label="训练看板">
    <header className="panel-header home-week-header">
      <p className="home-card-label">训练看板</p><span className="dashboard-today">今天 {monthDay(date)}</span>
    </header>
    <div className="calendar-body internal-scroll dashboard-scroll" tabIndex={0} aria-label="训练概览与记录">
      <section className={'dashboard-focus '+(!focusDate?'finished':'')} aria-label={state.draft?'待继续的训练':'下一次训练'}>
        <div className="dashboard-focus-heading"><span>{state.draft?'尚未结束的训练':focusDate?'下一次训练':'本轮计划'}</span>
          <span className="dashboard-date-badge">{state.draft?'待继续':focusDate?distanceLabel(focusDate,date):'已完成'}</span>
        </div>
        <div className="next-date"><h3>{focusDate?dateLabel(focusDate):'本轮训练已完成'}</h3></div>
        <p className="dashboard-focus-detail"><Icon name={state.draft?'pause':focusDate?'clock':'check'} size={16}/>
          {state.draft?`已跟练 ${durationLabel(state.draft.elapsed)} · 第 ${Math.min(state.draft.index+1,state.draft.stages.length)} / ${state.draft.stages.length} 段`:focusDate?`预计 ${durationLabel(total)} · ${plan.items.length} 个动作`:`已完成 ${dates.filter(d=>completed.has(d)).length} 次训练`}
        </p>
      </section>

      <section className="dashboard-week-stats" aria-label="本周训练统计">
        <div className="dashboard-week-count"><span>本周完成</span><strong>{weekDone}<small>/ {thisWeek.length} 次</small></strong>
          <div className="progress dashboard-week-progress" role="progressbar" aria-label="本周训练完成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={weekPercent}><span style={{width:weekPercent+'%'}}/></div>
        </div>
        <div><span>本周跟练</span><strong>{elapsed[0]}<small>{elapsed.slice(1).join(' ')}</small></strong><small className="dashboard-stat-note">按实际用时统计</small></div>
      </section>

      <section className="dashboard-details">
        <div className="dashboard-content-switch" role="group" aria-label="看板内容">
          <button aria-pressed={content==='schedule'} onClick={()=>setContent('schedule')}>近期安排</button>
          <button aria-pressed={content==='history'} onClick={()=>setContent('history')}>训练记录</button>
        </div>
        {content==='schedule'?<ul className="schedule-list dashboard-list" aria-label="接下来的训练安排">
          {upcoming.map(d=><li className="schedule-row dashboard-row" key={d}>
            <span className="dashboard-date-tile" aria-hidden="true"><small>{Number(d.slice(5,7))}月</small><strong>{Number(d.slice(8))}</strong></span>
            <div className="dashboard-row-copy"><strong>{dateLabel(d)}</strong><small>{d<date?'原训练日，可按需补练':'训练日'}</small></div>
            <span className="status">{distanceLabel(d,date)}</span>
          </li>)}
          {!upcoming.length&&<li className="dashboard-empty"><Icon name={focusDate?'calendar':'check'} size={26}/><p>{focusDate?'这是本轮最后一次训练':'本轮安排已全部完成'}</p><small>{focusDate?'完成后即可结束本轮计划':'可编辑计划，安排下一轮训练'}</small></li>}
        </ul>:<ul className="dashboard-list" aria-label="最近三次跟练记录">
          {history.map(({workout:w,date:d})=><li className="dashboard-row" key={w.id}>
            <span className={'dashboard-record-icon '+(w.completed?'complete':'')}><Icon name={w.completed?'check':'history'} size={20}/></span>
            <div className="dashboard-row-copy"><strong>{dateLabel(d)}</strong><small>实际跟练 {durationLabel(w.elapsed)}</small></div>
            <span className={'status '+(w.completed?'complete':'')}>{w.completed?'已完成':'部分训练'}</span>
          </li>)}
          {!history.length&&<li className="dashboard-empty"><Icon name="history" size={26}/><p>还没有跟练记录</p><small>保存训练后，在这里查看实际用时</small></li>}
        </ul>}
      </section>
    </div>
    <footer className="home-session-footer">
      {state.draft?<button className="primary dashboard-start" disabled={busy} onClick={onResume}><Icon name="play" size={20}/>继续跟练</button>:<button className="primary dashboard-start" disabled={busy||!next} onClick={()=>next&&onStart(plan,next)}><Icon name="play" size={20}/>{next?'进入跟练':'本轮已完成'}</button>}
      {state.draft&&<button className="text-button danger home-discard" disabled={busy} onClick={onDiscard}>丢弃未完成跟练</button>}
    </footer>
  </section>;
}
