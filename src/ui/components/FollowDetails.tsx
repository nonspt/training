import type {Session,Stage} from '../../domain/types.ts';
import {categoryNames} from '../../domain/types.ts';
import {durationLabel} from '../../domain/plans.ts';
import {EFFORT_MAX} from '../../domain/training-targets.ts';
import {Icon} from './Icon.tsx';
import './FollowDetails.css';

const target=(stage:Stage)=>stage.mode==='time'?durationLabel(stage.seconds):stage.reps+' 次';
// Only cardio exposes an editable effort target; other stages also carry a legacy default.
const hasEffort=(stage:Stage)=>!stage.isRest&&stage.category==='cardio'&&stage.mode==='time'&&stage.weight===0&&stage.effort>0;
function phoneTargets(stage:Stage|undefined,elapsed:number):string[][]{
  if(!stage)return [durationLabel(elapsed).split(' ')];
  if(stage.isRest||stage.category==='recovery')return [durationLabel(stage.seconds).split(' ')];
  if(stage.mode==='reps')return [[String(stage.reps),'次'],...(stage.weight>0?[[String(stage.weight),'kg']]:[])];
  if(stage.weight>0)return [[String(stage.weight),'kg'],durationLabel(stage.seconds).split(' ')];
  return hasEffort(stage)?[[String(stage.effort),'/ '+EFFORT_MAX]]:[durationLabel(stage.seconds).split(' ')];
}

function EffortMeter({effort}:{effort:number}){
  return <div className="effort-meter" role="meter" aria-label="计划主观用力目标" aria-valuemin={1} aria-valuemax={EFFORT_MAX} aria-valuenow={effort}>
    {Array.from({length:EFFORT_MAX},(_,i)=><span key={i} className={i<effort?'filled':''}/>)}
  </div>;
}

export function FollowDetails({session}:{session:Session}){
  const current=session.stages[session.index],next=session.stages[session.index+1],afterNext=session.stages[session.index+2];
  const exertion=!!current&&!current.isRest&&!current.weight&&current.mode==='time';
  const label=!current?'实际用时':current.isRest?'组间恢复':current.weight?'训练重量':current.mode==='reps'?'本组目标':'主观用力';
  const reading=!current?durationLabel(session.elapsed).split(' '):current.isRest?durationLabel(current.seconds).split(' '):current.weight?[String(current.weight),'kg']:current.mode==='reps'?[String(current.reps),'次']:[String(current.effort),'/ '+EFFORT_MAX];
  const note=!current?'确认保存后，本次记录才会写入本机。':current.isRest?'恢复结束后自动进入下一环节。':current.mode==='reps'?'完成次数后，点击中央按钮确认。':'计时结束后自动进入下一环节。';
  const phoneReadings=phoneTargets(current,session.elapsed);

  return <aside className="follow-targets follow-details">
    <section className="module target-card internal-scroll" aria-label="当前训练目标">
      <div className="detail-card-header"><h3>{label}</h3><span className="detail-badge">{!current?'本次汇总':current.isRest?'恢复':current.groupKind?'第 '+current.round+' / '+current.rounds+' 轮':current.sets>1?`${current.set} / ${current.sets} 组`:categoryNames[current.category]}</span></div>
      <div className="target-reading"><strong>{reading[0]}</strong><span>{reading.slice(1).join(' ')}</span></div>
      {exertion&&<EffortMeter effort={current.effort}/>}
      <div className="phone-target-summary" role="group" aria-label="当前训练目标摘要">
        <h3 className="phone-detail-title">当前目标</h3>
        <div className={'phone-target-readings '+(phoneReadings.length>1?'paired':'')}>
          {phoneReadings.map(([value,...unit],index)=><div className="phone-target-reading" key={index}><strong>{value}</strong><span>{unit.join(' ')}</span></div>)}
        </div>
        {current&&hasEffort(current)&&<EffortMeter effort={current.effort}/>}
      </div>
      <dl className="detail-facts">
        {!current?<><div><dt>完成环节</dt><dd>{session.completed.length} / {session.stages.length}</dd></div><div><dt>跳过环节</dt><dd>{session.skipped.length} 项</dd></div></>:current.isRest?<>
          <div><dt>接续动作</dt><dd>{next?.name??'本次结束'}</dd></div><div><dt>准备器械</dt><dd>{next?.equipment??'无需器械'}</dd></div>
        </>:<>
          <div><dt>{current.mode==='reps'&&!current.weight?'本动作待练':'本组目标'}</dt><dd>{current.mode==='reps'&&!current.weight?session.stages.slice(session.index).filter(stage=>stage.itemId===current.itemId&&!stage.isRest).length+' 组':target(current)}</dd></div>
          <div><dt>使用器械</dt><dd>{current.equipment}</dd></div>
        </>}
      </dl>
      <p className="detail-note">{note}</p>
    </section>

    <section className="module next-card internal-scroll" aria-label="下一段训练">
      <div className="detail-card-header"><h3><span className="wide-detail-title">{next?'下一环节':current?'最后一环节':'训练回顾'}</span><span className="phone-detail-title">下一段</span></h3>{next&&<span className="detail-badge">{session.index+2} / {session.stages.length}</span>}</div>
      {next?<>
        <strong className="next-movement">{next.name}</strong>
        <span className="next-value">{target(next)}{next.weight>0&&<span className="phone-next-weight"> · {next.weight} kg</span>}<span className="next-extra">{next.weight>0?' · '+next.weight+' kg':''}{next.groupKind&&!next.isRest?' · 第 '+next.round+' / '+next.rounds+' 轮':next.sets>1&&!next.isRest?' · 第 '+next.set+' / '+next.sets+' 组':''}{next.setKind==='warmup'&&!next.isRest?' · 热身组':''}</span></span>
        {next.effort>0&&<p className={'next-effort'+(hasEffort(next)?'':' phone-hide-effort')}><span>主观用力</span><strong>{next.effort} / {EFFORT_MAX}</strong></p>}
        <p className="next-equipment"><Icon name="train" size={16}/><span>{next.equipment}</span></p>
        <p className="next-preparation">{next.cue}</p>
        {afterNext&&<div className="after-next"><span>再下一环节</span><strong>{afterNext.name}</strong><small>{target(afterNext)}{afterNext.sets>1&&!afterNext.isRest?` · 第 ${afterNext.set} 组`:''}</small></div>}
      </>:<>
        <strong className="next-movement">{current?'完成后即可保存':'本次跟练已结束'}</strong>
        <dl className="detail-facts"><div><dt>累计用时</dt><dd>{durationLabel(session.elapsed)}</dd></div><div><dt>完成环节</dt><dd>{session.completed.length} / {session.stages.length}</dd></div></dl>
        <p className="next-preparation">{current?'完成当前动作后，在中央查看并保存本次训练。':session.skipped.length?'本次含跳过环节，将保存为部分训练。':'在中央查看训练汇总并确认保存。'}</p>
      </>}
    </section>
  </aside>;
}
