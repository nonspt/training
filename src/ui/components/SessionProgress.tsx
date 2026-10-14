import type {CSSProperties} from 'react';
import type {Session} from '../../domain/types.ts';
import {sessionProgress} from '../../domain/session-progress.ts';

export function SessionProgress({session}:{session:Session}){
  const {percent,currentFraction}=sessionProgress(session),current=session.stages[session.index];
  return <div className="session-progress" role="progressbar" aria-label="本次训练进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-valuetext={current?'第 '+(session.index+1)+' / '+session.stages.length+' 段 · '+current.name+(current.mode==='reps'?' · 等待次数确认':''):'训练结束'}>
    <div className="session-progress-track" style={{'--segment-gap':session.stages.length>40?'0px':'2px'} as CSSProperties}>
      {session.stages.map((stage,index)=>{
        const isCurrent=index===session.index,skipped=session.skipped.includes(stage.id),past=index<session.index,fraction=past?1:isCurrent?currentFraction:0;
        const status=skipped?'已跳过':past?'已完成':isCurrent?'当前':'待训练';
        return <span key={stage.id} className={'session-progress-segment '+stage.category+(isCurrent?' current':'')+(skipped?' skipped':'')} data-progress-stage={stage.id} data-progress-category={stage.category} data-progress-status={status} title={(index+1)+' · '+stage.name+' · '+status} aria-hidden="true"><span className="session-progress-fill" style={{width:fraction*100+'%'}}/></span>;
      })}
    </div>
  </div>;
}
