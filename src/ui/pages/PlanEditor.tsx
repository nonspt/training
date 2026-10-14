import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {Plan,PlanItem} from '../../domain/types.ts';
import {ExerciseLibrary} from '../components/ExerciseLibrary.tsx';
import {createItem,firstTrainingDate,insertItem,itemSummary,moveItem,today,uid} from '../../domain/plans.ts';
import {findExercise} from '../../content/exercises.ts';
import {Modal} from '../components/Modal.tsx';
import {Icon} from '../components/Icon.tsx';
import {RangeField} from '../components/RangeField.tsx';
import {PlanItemSettings} from '../components/PlanItemSettings.tsx';
import {usePlanDrag} from '../components/usePlanDrag.ts';
const days=[{day:1,name:'一'},{day:2,name:'二'},{day:3,name:'三'},{day:4,name:'四'},{day:5,name:'五'},{day:6,name:'六'},{day:0,name:'日'}];
export function PlanEditor({existing,revision,onClose,onSave}:{existing?:Plan;revision:number;onClose:()=>void;onSave:(plan:Plan,revision:number)=>Promise<void>}){
  const [plan,setPlan]=useState<Plan>(()=>existing?structuredClone(existing):{id:uid(),name:'我的训练计划',type:'strength',weeks:4,days:[1,3,5],startDate:today(),items:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1});
  const [originalRevision]=useState(revision),[active,setActive]=useState<string|null>(null),[insertAt,setInsertAt]=useState<number|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[announcement,setAnnouncement]=useState('');
  const scroll=useRef<HTMLDivElement>(null),[height,setHeight]=useState(300);
  useEffect(()=>{const host=scroll.current!;const observer=new ResizeObserver(()=>setHeight(host.clientHeight));observer.observe(host);return ()=>observer.disconnect();},[]);
  // Center the active card, reserving a complete previous row whenever both fit.
  useLayoutEffect(()=>{
    if(!active)return;
    const host=scroll.current!,item=host.querySelector<HTMLElement>('[data-item-id="'+active+'"]');
    if(!item)return;
    let frame=0;
    function center(){
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const h=host.getBoundingClientRect(),b=item!.getBoundingClientRect();
        const index=Number(item!.dataset.itemIndex),previous=host.querySelector<HTMLElement>('[data-item-index="'+(index-1)+'"]');
        let offset=Math.max(8,(host.clientHeight-b.height)/2);
        if(previous){
          const span=b.top-previous.getBoundingClientRect().top;
          if(host.clientHeight-b.height>=span+8)offset=Math.max(offset,span+8);
        }
        host.scrollTo({top:host.scrollTop+b.top-h.top-offset,behavior:'instant'});
      });
    }
    const observer=new ResizeObserver(center);
    observer.observe(item);center();
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[active,height,plan.items.map(item=>item.id).join(',')]);

  function add(id:string,index=insertAt??plan.items.length){if(plan.items.length>=100){setError('每个计划最多添加 100 个动作。');return;}const exercise=findExercise(id),item=createItem(exercise);setPlan(p=>({...p,items:insertItem(p.items,item,index)}));setActive(item.id);setInsertAt(null);setAnnouncement(`已添加${exercise.name}，正在编辑第 ${index+1} 个动作。`);setError('');}
  const {drag,begin,suppress}=usePlanDrag(scroll,(payload,index)=>{if(payload.kind==='library')add(payload.id,index);else {setPlan(p=>({...p,items:moveItem(p.items,payload.id,index)}));setActive(payload.id);setAnnouncement('动作顺序已调整。');}});
  function update(id:string,patch:Partial<PlanItem>){setPlan(p=>({...p,items:p.items.map(i=>i.id===id?{...i,...patch}:i)}));}
  function remove(id:string){const index=plan.items.findIndex(i=>i.id===id);setPlan(p=>({...p,items:p.items.filter(i=>i.id!==id)}));if(active===id)setActive(null);if(insertAt!==null)setInsertAt(Math.min(insertAt,plan.items.length-1));setAnnouncement(`已删除第 ${index+1} 个动作。`);}
  function reorder(id:string,direction:number){const n=plan.items.findIndex(i=>i.id===id);setPlan(p=>({...p,items:moveItem(p.items,id,n+(direction>0?2:-1))}));setAnnouncement('动作顺序已调整。');}
  async function save(){setBusy(true);setError('');try{await onSave({...plan,name:plan.name.trim(),startDate:existing?plan.startDate:firstTrainingDate(plan.days),updatedAt:new Date().toISOString(),version:existing?existing.version+1:1},originalRevision);}catch(e){setError(e instanceof Error?e.message:'保存失败，原计划未改变。');}finally{setBusy(false);}}
  const libraryType=plan.type==='aerobic'?'aerobic':'strength';
  return <Modal title={existing?'编辑计划':'创建计划'} wide busy={busy} onClose={()=>{if(!busy)onClose();}}>
    <div className={'editor-grid compact-editor '+(busy?'saving':'')} inert={busy}>
      <ExerciseLibrary type={libraryType} onTypeChange={type=>setPlan(p=>({...p,type}))} onAdd={id=>add(id)} onDragStart={begin} suppressClick={()=>suppress.current} insertAt={insertAt} onCancelInsert={()=>setInsertAt(null)}/>
      <div className="editor-arrow" aria-hidden="true"><Icon name="arrow" size={20}/></div>
      <section className={'module plan-module '+(drag?'dragging':'')} aria-label="计划区">
        <div className="plan-meta">
          <label className="name-field"><span>计划名称</span><input aria-label="计划名称" maxLength={60} value={plan.name} onChange={e=>setPlan(p=>({...p,name:e.target.value}))}/></label>
          <div className="plan-schedule-row">
            <RangeField label="周数" sliderLabel="调节计划周数" unit="周" value={plan.weeks} min={1} max={52} onChange={weeks=>setPlan(p=>({...p,weeks}))}/>
            <div className="weekday-field">
              <span className="field-label">训练日</span>
              <div className="day-choices" role="group" aria-label="周训练日">{days.map(({day,name})=><button type="button" key={day} aria-label={'星期'+name} aria-pressed={plan.days.includes(day)} className={plan.days.includes(day)?'selected':''} onClick={()=>setPlan(p=>({...p,days:p.days.includes(day)?p.days.filter(d=>d!==day):[...p.days,day]}))}>{name}</button>)}</div>
            </div>
          </div>
        </div>
        <div className="plan-scroll internal-scroll" data-plan-scroll ref={scroll} tabIndex={0} aria-label="计划动作时间线" style={{paddingBlock:plan.items.length&&active?Math.max(16,height/2-120):8,'--plan-scroll-height':height+'px'} as CSSProperties}>
          {!plan.items.length?<div className="empty-state editor-empty"><span className="empty-icon"><Icon name="plus" size={28}/></span><h3>添加第一个动作</h3></div>:Array.from({length:plan.items.length+1},(_,index)=>{
            const item=plan.items[index],exercise=item?findExercise(item.exerciseId):null,expanded=!!item&&active===item.id;
            return <div className="sequence-block" key={item?.id??'last'}>
              <button type="button" data-drop-index={index} className={'insert-gap '+(insertAt===index?'chosen ':'')+(drag?.index===index?'drop-target':'')} aria-label={'在第 '+(index+1)+' 位插入动作'} onClick={()=>{setInsertAt(index);setAnnouncement('已选择第 '+(index+1)+' 个插入位置，请在动作库中选择动作。');}}><span/><Icon name="plus" size={14}/><span/></button>
              {item&&exercise&&<article className={'plan-item '+(expanded?'expanded':'')} data-item-id={item.id} data-item-index={index}>
                <div className="plan-item-heading">
                  <button className="icon-button drag-handle" aria-label={'拖动'+exercise.name+'排序'} title="拖动排序，点按展开" onClick={()=>{if(!suppress.current)setActive(item.id);}} onPointerDown={e=>begin(e,{kind:'plan',id:item.id,name:exercise.name})}><Icon name="grip" size={16}/></button>
                  <button className="item-toggle" aria-expanded={expanded} onClick={()=>setActive(expanded?null:item.id)}>
                    <span className="item-number">{String(index+1).padStart(2,'0')}</span>
                    <span><strong>{exercise.name}</strong>{!expanded&&<small>{itemSummary(item)}</small>}</span>
                    <Icon name={expanded?'up':'down'} size={16}/>
                  </button>
                  <button className="icon-button danger" aria-label={'删除'+exercise.name} title={'删除'+exercise.name} onClick={()=>remove(item.id)}><Icon name="trash" size={16}/></button>
                </div>
                {expanded&&<PlanItemSettings item={item} exercise={exercise} index={index} total={plan.items.length} onChange={patch=>update(item.id,patch)} onReorder={direction=>reorder(item.id,direction)} onDone={()=>setActive(null)}/>}
              </article>}
            </div>;
          })}
        </div>
        <footer className="editor-actions">
          {error&&<div className="editor-status"><p className="error-text" role="alert">{error}</p></div>}
          <div className="action-row">
            <button className="secondary" disabled={busy} onClick={onClose}>取消</button>
            <button className="primary" disabled={busy||!plan.items.length||!plan.days.length||!plan.name.trim()} onClick={()=>void save()}><Icon name="check" size={16}/>{busy?'正在保存…':existing?'保存修改':'完成设计'}</button>
          </div>
        </footer>
      </section>
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {drag&&<div className="drag-ghost" aria-hidden="true" style={{left:drag.x,top:drag.y}}><Icon name="grip" size={20}/>{drag.payload.name}</div>}
  </Modal>;
}
