import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {DayPlan,Plan,PlanGroup,PlanItem} from '../../domain/types.ts';
import {ExerciseLibrary} from '../components/ExerciseLibrary.tsx';
import {createItem,firstTrainingDate,insertItem,itemSummary,today,uid} from '../../domain/plans.ts';
import {cleanGroups,cloneRoutine,insertionBoundary,moveRoutine,resizeSets,routineBlocks} from '../../domain/program.ts';
import {findExercise} from '../../content/exercises.ts';
import {Modal} from '../components/Modal.tsx';
import {Icon} from '../components/Icon.tsx';
import {RangeField} from '../components/RangeField.tsx';
import {PlanItemSettings} from '../components/PlanItemSettings.tsx';
import {DayPlanBar} from '../components/DayPlanBar.tsx';
import {GroupSettings} from '../components/GroupSettings.tsx';
import {usePlanDrag} from '../components/usePlanDrag.ts';
import './PlanEditor.css';
const days=[{day:1,name:'一'},{day:2,name:'二'},{day:3,name:'三'},{day:4,name:'四'},{day:5,name:'五'},{day:6,name:'六'},{day:0,name:'日'}];
type Routine=Pick<DayPlan,'items'|'groups'>;
export function PlanEditor({existing,revision,onClose,onSave}:{existing?:Plan;revision:number;onClose:()=>void;onSave:(plan:Plan,revision:number)=>Promise<void>}){
  const [plan,setPlan]=useState<Plan>(()=>existing?structuredClone(existing):{id:uid(),name:'我的训练计划',type:'strength',weeks:4,days:[1,3,5],startDate:today(),items:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1});
  const [day,setDay]=useState<number|null>(existing?.dayPlans?.[0]?.day??null);
  const [originalRevision]=useState(revision),[active,setActive]=useState<string|null>(null),[insertAt,setInsertAt]=useState<number|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[announcement,setAnnouncement]=useState('');
  const [combining,setCombining]=useState(false),[selected,setSelected]=useState<string[]>([]),[groupEditor,setGroupEditor]=useState<string|null>(null);
  const scroll=useRef<HTMLDivElement>(null),[height,setHeight]=useState(300);
  const routine=plan.dayPlans?.find(d=>d.day===day)??{items:plan.items,groups:plan.groups};
  const items=routine.items,groups=routine.groups??[];
  function modify(change:(routine:Routine)=>Routine){
    setPlan(p=>p.dayPlans?{...p,dayPlans:p.dayPlans.map(d=>d.day===day?{...d,...change(d)}:d)}:{...p,...change({items:p.items,groups:p.groups})});
  }
  function focusDay(next:number|null){setDay(next);setActive(null);setGroupEditor(null);setInsertAt(null);setSelected([]);setCombining(false);setError('');scroll.current?.scrollTo({top:0});}
  function activate(id:string|null){setActive(id);setGroupEditor(null);}
  function toggleDaily(){
    if(plan.dayPlans){
      if(!window.confirm('所有训练日改用当前方案？其他训练日方案将在保存后被替换。'))return;
      setPlan(p=>({...p,items:structuredClone(items),groups:structuredClone(groups),dayPlans:undefined}));focusDay(null);
    }else{
      const dayPlans=days.filter(d=>plan.days.includes(d.day)).map(d=>({...cloneRoutine({items,groups}),day:d.day,name:'周'+d.name+'训练'}));
      setPlan(p=>({...p,dayPlans}));focusDay(dayPlans[0]?.day??null);
    }
  }
  function toggleDay(value:number){
    const adding=!plan.days.includes(value),nextDays=adding?[...plan.days,value]:plan.days.filter(d=>d!==value);
    setPlan(p=>({...p,days:nextDays,...(p.dayPlans?{dayPlans:adding?[...p.dayPlans,{...cloneRoutine({items,groups}),day:value,name:'周'+days.find(d=>d.day===value)!.name+'训练'}].sort((a,b)=>((a.day+6)%7)-((b.day+6)%7)):p.dayPlans.filter(d=>d.day!==value)}:{})}));
    if(!adding&&day===value)focusDay(nextDays[0]??null);
    else if(adding&&plan.dayPlans&&day===null)focusDay(value);
  }
  useEffect(()=>{const host=scroll.current!;const observer=new ResizeObserver(()=>setHeight(host.clientHeight));observer.observe(host);return ()=>observer.disconnect();},[]);
  useLayoutEffect(()=>{
    const host=scroll.current!,item=active?host.querySelector<HTMLElement>('[data-item-id="'+active+'"]'):groupEditor?host.querySelector<HTMLElement>('[data-group-id="'+groupEditor+'"]'):null;
    if(!item)return;let frame=0;
    function center(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const h=host.getBoundingClientRect(),b=item!.getBoundingClientRect();
      const index=Number(item!.dataset.itemIndex),previous=active?host.querySelector<HTMLElement>('[data-item-index="'+(index-1)+'"]'):null;
      let offset=Math.max(8,(host.clientHeight-b.height)/2);
      if(previous){const span=b.top-previous.getBoundingClientRect().top;if(host.clientHeight-b.height>=span+8)offset=Math.max(offset,span+8);}
      host.scrollTo({top:host.scrollTop+b.top-h.top-offset,behavior:'instant'});
    });}
    const observer=new ResizeObserver(center);observer.observe(item);center();return ()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[active,groupEditor,height,day,items.map(item=>item.id).join(',')]);

  function add(id:string,index=insertAt??items.length){
    if(items.length>=100){setError('每个训练日最多添加 100 个动作。');return;}
    const exercise=findExercise(id),item=createItem(exercise),at=insertionBoundary(items,groups,index);
    modify(r=>({...r,items:insertItem(r.items,item,at)}));activate(item.id);setInsertAt(null);setAnnouncement('已添加'+exercise.name+'，正在编辑第 '+(at+1)+' 个动作。');setError('');
  }
  const {drag,begin,suppress}=usePlanDrag(scroll,(payload,index)=>{
    if(payload.kind==='library')add(payload.id,index);
    else{modify(r=>({...r,items:moveRoutine(r.items,r.groups??[],payload.id,index)}));activate(payload.id);setAnnouncement('动作顺序已调整，组合保持完整。');}
  });
  function update(id:string,patch:Partial<PlanItem>){modify(r=>({...r,items:r.items.map(i=>i.id===id?{...i,...patch}:i)}));}
  function remove(id:string){
    const index=items.findIndex(i=>i.id===id);
    modify(r=>{const remaining=r.items.filter(i=>i.id!==id);return {items:remaining,groups:cleanGroups(remaining,r.groups)};});
    if(active===id)activate(null);setSelected(ids=>ids.filter(i=>i!==id));if(insertAt!==null)setInsertAt(Math.min(insertAt,items.length-1));setAnnouncement('已删除第 '+(index+1)+' 个动作。');
  }
  function reorder(id:string,direction:number){
    const blocks=routineBlocks(items,groups),n=blocks.findIndex(b=>b.some(i=>i.id===id)),target=blocks[n+direction];if(!target)return;
    const index=items.findIndex(i=>i.id===target[0].id)+(direction>0?target.length:0);
    modify(r=>({...r,items:moveRoutine(r.items,r.groups??[],id,index)}));setAnnouncement('动作顺序已调整，组合保持完整。');
  }
  function createGroup(kind:PlanGroup['kind']){
    const members=items.filter(i=>selected.includes(i.id)),start=items.findIndex(i=>i.id===members[0]?.id);
    if(members.length<2||members.length>10||kind==='superset'&&members.length!==2){setError(kind==='superset'?'请选择两个连续动作。':'请选择 2–10 个连续动作。');return;}
    if(members.some((i,n)=>items[start+n]?.id!==i.id)){setError('请选择连续的动作，或先调整动作顺序。');return;}
    const group:PlanGroup={id:uid(),kind,itemIds:members.map(i=>i.id),rounds:Math.max(...members.map(i=>i.sets)),rest:45,transitionRest:0};
    modify(r=>({items:r.items.map(i=>group.itemIds.includes(i.id)?resizeSets(i,group.rounds):i),groups:[...(r.groups??[]),group]}));
    setActive(null);setGroupEditor(group.id);setCombining(false);setSelected([]);setError('');setAnnouncement('动作组合已创建，可调整轮数与休息。');
  }
  function updateGroup(id:string,patch:Partial<PlanGroup>){
    modify(r=>{const group=r.groups!.find(g=>g.id===id)!;return {groups:r.groups!.map(g=>g.id===id?{...g,...patch}:g),items:patch.rounds?r.items.map(i=>group.itemIds.includes(i.id)?resizeSets(i,patch.rounds!):i):r.items};});
  }
  async function save(){
    setBusy(true);setError('');
    try{
      const first=plan.dayPlans?.[0];
      await onSave({...plan,...(first?{items:first.items,groups:first.groups}:{}),name:plan.name.trim(),startDate:existing?plan.startDate:firstTrainingDate(plan.days),updatedAt:new Date().toISOString(),version:existing?existing.version+1:1},originalRevision);
    }catch(e){setError(e instanceof Error?e.message:'保存失败，原计划未改变。');}finally{setBusy(false);}
  }
  const libraryType=plan.type==='aerobic'?'aerobic':'strength';
  const canSave=(plan.dayPlans?plan.dayPlans.length>0&&plan.dayPlans.every(d=>d.items.length&&d.name.trim()):items.length>0)&&plan.days.length&&plan.name.trim();
  return <Modal title={existing?'编辑计划':'创建计划'} wide busy={busy} onClose={()=>{if(!busy)onClose();}}>
    <div className={'editor-grid compact-editor '+(busy?'saving':'')} inert={busy}>
      <ExerciseLibrary type={libraryType} onTypeChange={type=>setPlan(p=>({...p,type}))} onAdd={id=>add(id)} onDragStart={begin} suppressClick={()=>suppress.current} insertAt={insertAt} onCancelInsert={()=>setInsertAt(null)}/>
      <div className="editor-arrow" aria-hidden="true"><Icon name="arrow" size={20}/></div>
      <section className={'module plan-module '+(drag?'dragging':'')} aria-label="计划区">
        <div className="plan-meta">
          <div className="plan-name-row"><label className="name-field"><span>计划名称</span><input aria-label="计划名称" maxLength={60} value={plan.name} onChange={e=>setPlan(p=>({...p,name:e.target.value}))}/></label>
            <button type="button" className={'daily-toggle '+(plan.dayPlans?'selected':'')} aria-label={plan.dayPlans?'合并为同一方案':'启用分日编排'} aria-pressed={!!plan.dayPlans} disabled={!plan.days.length} onClick={toggleDaily}>分日</button>
          </div>
          <div className="plan-schedule-row">
            <RangeField label="周数" sliderLabel="调节计划周数" unit="周" value={plan.weeks} min={1} max={52} onChange={weeks=>setPlan(p=>({...p,weeks}))}/>
            <div className="weekday-field"><span className="field-label">训练日</span>
              <div className="day-choices" role="group" aria-label="周训练日">{days.map(({day:value,name})=><button type="button" key={value} aria-label={'星期'+name} aria-pressed={plan.days.includes(value)} className={plan.days.includes(value)?'selected':''} onClick={()=>toggleDay(value)}>{name}</button>)}</div>
            </div>
          </div>
          {plan.dayPlans&&day!==null&&<DayPlanBar plan={plan} day={day} onDay={focusDay} onChange={setPlan}/>}
        </div>
        <div className="plan-scroll internal-scroll" data-plan-scroll ref={scroll} tabIndex={0} aria-label="计划动作时间线" style={{paddingBlock:items.length&&(active||groupEditor)?Math.max(16,height/2-120):8,'--plan-scroll-height':height+'px'} as CSSProperties}>
          {combining&&<div className="group-builder" aria-label="新建动作组合"><span>选择连续动作 · 已选 {selected.length}</span><div><button type="button" className="secondary" onClick={()=>createGroup('superset')}>组成超级组</button><button type="button" className="secondary" onClick={()=>createGroup('circuit')}>组成循环组</button></div></div>}
          {!items.length?<div className="empty-state editor-empty"><span className="empty-icon"><Icon name="plus" size={28}/></span><h3>添加第一个动作</h3></div>:Array.from({length:items.length+1},(_,index)=>{
            const item=items[index],exercise=item?findExercise(item.exerciseId):null,expanded=!!item&&active===item.id,group=groups.find(g=>g.itemIds.includes(item?.id));
            const firstGroup=group?.itemIds[0]===item?.id&&!!group;
            const blocks=routineBlocks(items,groups),blockIndex=blocks.findIndex(b=>b.some(i=>i.id===item?.id));
            return <div className={'sequence-block '+(group?'group-member':'')} key={item?.id??'last'}>
              <button type="button" data-drop-index={index} className={'insert-gap '+(insertAt===index?'chosen ':'')+(drag?.index===index?'drop-target':'')} aria-label={'在第 '+(index+1)+' 位插入动作'} onClick={()=>{const at=insertionBoundary(items,groups,index);setInsertAt(at);setAnnouncement('已选择第 '+(at+1)+' 个插入位置，请在动作库中选择动作。');}}><span/><Icon name="plus" size={14}/><span/></button>
              {firstGroup&&<div className="plan-group" data-group-id={group.id}>
                <button type="button" className="group-heading" aria-expanded={groupEditor===group.id} aria-label={'编辑'+(group.kind==='superset'?'超级组':'循环组')} onClick={()=>{setActive(null);setGroupEditor(groupEditor===group.id?null:group.id);}}>
                  <strong>{group.kind==='superset'?'超级组':'循环组'}</strong><span>{group.itemIds.length} 动作 · {group.rounds} 轮</span><Icon name={groupEditor===group.id?'up':'down'} size={14}/>
                </button>
                {groupEditor===group.id&&<GroupSettings group={group} onChange={patch=>updateGroup(group.id,patch)} onSplit={()=>{modify(r=>({...r,groups:r.groups?.filter(g=>g.id!==group.id)}));setGroupEditor(null);}} onDone={()=>setGroupEditor(null)}/>}
              </div>}
              {item&&exercise&&<article className={'plan-item '+(expanded?'expanded ':'')+(item.setTargets?'per-set-item':'')} data-item-id={item.id} data-item-index={index}>
                <div className="plan-item-heading">
                  {combining?<input type="checkbox" aria-label={'选择第'+(index+1)+'个动作'+exercise.name} disabled={!!group} checked={selected.includes(item.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,item.id]:ids.filter(id=>id!==item.id))}/>:<button className="icon-button drag-handle" aria-label={'拖动'+exercise.name+'排序'} title="拖动排序，点按展开" onClick={()=>{if(!suppress.current)activate(item.id);}} onPointerDown={e=>begin(e,{kind:'plan',id:item.id,name:exercise.name})}><Icon name="grip" size={16}/></button>}
                  <button className="item-toggle" aria-expanded={expanded} onClick={()=>activate(expanded?null:item.id)}>
                    <span className="item-number">{String(index+1).padStart(2,'0')}</span><span><strong>{exercise.name}</strong>{!expanded&&<small>{group?(group.kind==='superset'?'超级组':'循环组')+' · ':''}{itemSummary(item)}</small>}</span><Icon name={expanded?'up':'down'} size={16}/>
                  </button>
                  <button className="icon-button danger" aria-label={'删除'+exercise.name} title={'删除'+exercise.name} onClick={()=>remove(item.id)}><Icon name="trash" size={16}/></button>
                </div>
                {expanded&&<PlanItemSettings key={item.id} item={item} exercise={exercise} index={blockIndex} total={blocks.length} grouped={!!group} onChange={patch=>update(item.id,patch)} onReorder={direction=>reorder(item.id,direction)} onDone={()=>activate(null)}/>}
              </article>}
            </div>;
          })}
        </div>
        <footer className="editor-actions">
          {error&&<div className="editor-status"><p className="error-text" role="alert">{error}</p></div>}
          <button type="button" className="text-button combine-toggle" disabled={busy||items.filter(i=>!groups.some(g=>g.itemIds.includes(i.id))).length<2&&!combining} onClick={()=>{setCombining(!combining);setSelected([]);setActive(null);setGroupEditor(null);setError('');scroll.current?.scrollTo({top:0});}}>{combining?'取消选择':'组合动作'}</button>
          <div className="action-row"><button className="secondary" disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy||!canSave} onClick={()=>void save()}><Icon name="check" size={16}/>{busy?'正在保存…':existing?'保存修改':'完成设计'}</button></div>
        </footer>
      </section>
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {drag&&<div className="drag-ghost" aria-hidden="true" style={{left:drag.x,top:drag.y}}><Icon name="grip" size={20}/>{drag.payload.name}</div>}
  </Modal>;
}
