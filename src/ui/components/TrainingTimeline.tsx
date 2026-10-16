import {useLayoutEffect,useRef} from 'react';
import type {Session} from '../../domain/types.ts';
import {durationLabel} from '../../domain/plans.ts';
import {FlowConnections} from './FlowConnections.tsx';
import {Icon} from './Icon.tsx';
import './TrainingTimeline.css';

export function TrainingTimeline({session}:{session:Session}){
  const viewport=useRef<HTMLDivElement>(null),list=useRef<HTMLOListElement>(null);
  useLayoutEffect(()=>{
    const host=viewport.current,sequence=list.current;
    if(!host||!sequence)return;
    const phonePortrait=matchMedia('(max-width:600px) and (orientation:portrait)');
    let frame=0;
    const center=()=>{
      if(!host.clientHeight)return;
      const rows=sequence.querySelectorAll<HTMLElement>('[data-flow-node]');
      const first=rows[0],last=rows[rows.length-1],current=rows[Math.min(session.index,rows.length-1)];
      if(!first||!last||!current)return;
      if(phonePortrait.matches){
        sequence.style.paddingTop='0px';sequence.style.paddingBottom='0px';
        const a=host.getBoundingClientRect(),b=current.getBoundingClientRect(),top=a.top+host.clientTop,bottom=top+host.clientHeight;
        // Keep the current card visible without introducing empty centering space.
        if(b.top<top)host.scrollTop+=b.top-top;
        else if(b.bottom>bottom)host.scrollTop+=b.bottom-bottom;
        return;
      }
      // Both end cards need real scroll space to reach the viewport center.
      sequence.style.paddingTop=Math.max(0,(host.clientHeight-first.getBoundingClientRect().height)/2)+'px';
      sequence.style.paddingBottom=Math.max(0,(host.clientHeight-last.getBoundingClientRect().height)/2)+'px';
      const a=host.getBoundingClientRect(),b=current.getBoundingClientRect();
      host.scrollTop+=b.top+b.height/2-a.top-host.clientTop-host.clientHeight/2;
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(center);};
    const observer=new ResizeObserver(schedule);
    phonePortrait.addEventListener('change',schedule);
    observer.observe(host);observer.observe(sequence);center();
    return ()=>{observer.disconnect();phonePortrait.removeEventListener('change',schedule);cancelAnimationFrame(frame);};
  },[session.index,session.stages]);

  return <div className="follow-timeline training-timeline internal-scroll" ref={viewport} tabIndex={0} aria-label="完整训练时间线">
    <ol className="training-sequence" ref={list} aria-label="按顺序排列的跟练动作">
      {session.stages.map((stage,index)=><li className={`follow-step ${index===session.index?'current':''} ${index<session.index?'past':''}`} aria-current={index===session.index?'step':undefined} data-flow-node={stage.id} key={stage.id}>
        <span className="step-marker">{session.completed.includes(stage.id)?<Icon name="check" size={16}/>:String(index+1).padStart(2,'0')}</span>
        <div><strong>{stage.name}</strong><small>{stage.mode==='time'?durationLabel(stage.seconds):stage.reps+' 次'}{stage.weight>0?' · '+stage.weight+' kg':''}{stage.groupKind&&!stage.isRest?' · 第 '+stage.round+'/'+stage.rounds+' 轮':stage.sets>1&&!stage.isRest?' · '+stage.set+'/'+stage.sets+' 组':''}{stage.setKind==='warmup'&&!stage.isRest?' · 热身':''}</small>{session.skipped.includes(stage.id)&&<span className="step-status">已跳过</span>}</div>
      </li>)}
      <FlowConnections hostRef={list} layoutKey={session.id}/>
    </ol>
  </div>;
}
