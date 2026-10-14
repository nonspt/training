import {useState} from 'react';
import type {PointerEvent} from 'react';
import type {BodyPart,LibraryType} from '../../domain/types.ts';
import {bodyPartNames} from '../../domain/types.ts';
import {getLibraryGroups} from '../../domain/exercise-library.ts';
import type {LibraryFilter} from '../../domain/exercise-library.ts';
import {libraryGroups} from '../../content/library-layouts.ts';
import type {DragPayload} from './usePlanDrag.ts';
import {Icon} from './Icon.tsx';
import {SegmentedChoice} from './SegmentedChoice.tsx';

const typeOptions:readonly {value:LibraryType;label:string}[]=[{value:'aerobic',label:'有氧训练'},{value:'strength',label:'无氧训练'}];
const initialFilter:LibraryFilter={equipment:'all',bodyPart:'all',group:'all'};

export function ExerciseLibrary({type,onTypeChange,onAdd,onDragStart,suppressClick,insertAt,onCancelInsert}:{type:LibraryType;onTypeChange:(type:LibraryType)=>void;onAdd:(id:string)=>void;onDragStart:(event:PointerEvent,payload:DragPayload)=>void;suppressClick:()=>boolean;insertAt:number|null;onCancelInsert:()=>void}){
  const [filter,setFilter]=useState<LibraryFilter>(initialFilter);
  const groups=getLibraryGroups(type,filter),count=groups.reduce((total,group)=>total+group.exercises.length,0),total=libraryGroups[type].reduce((n,group)=>n+group.exerciseIds.length,0);
  const filtered=filter.equipment!=='all'||filter.bodyPart!=='all'||filter.group!=='all';
  return <section className="module library-module" aria-label="动作库">
    <header className="panel-header library-heading">
      <h3>动作库</h3>
      <SegmentedChoice label="训练类型" value={type} options={typeOptions} onChange={next=>{setFilter(initialFilter);onTypeChange(next);}}/>
      <span className="library-count">{filtered?count+'/'+total:total} 个动作</span>
    </header>
    <div className="library-controls">
      <div className="library-filter-grid">
        <label><span>部位</span><select aria-label="筛选训练部位" value={filter.bodyPart} onChange={event=>setFilter(current=>({...current,bodyPart:event.target.value as 'all'|BodyPart}))}><option value="all">全部部位</option>{Object.entries(bodyPartNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>分组</span><select aria-label="筛选动作分组" value={filter.group} onChange={event=>setFilter(current=>({...current,group:event.target.value}))}><option value="all">全部分组</option>{libraryGroups[type].map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      </div>
      <div className="filter-row" role="group" aria-label="筛选器械需求">
        {[{value:'all',label:'全部'},{value:'bodyweight',label:'徒手'},{value:'equipment',label:'器械'}].map(option=><button type="button" key={option.value} className={filter.equipment===option.value?'selected':''} aria-pressed={filter.equipment===option.value} onClick={()=>setFilter(current=>({...current,equipment:option.value as LibraryFilter['equipment']}))}>{option.label}</button>)}
        <button type="button" className="reset-library" aria-label="重置筛选" disabled={!filtered} onClick={()=>setFilter(initialFilter)}>重置</button>
      </div>
    </div>
    <div className="library-scroll internal-scroll" tabIndex={0} aria-label="动作库内容">
      {groups.map(group=><section className="exercise-group" key={group.id} data-library-group={group.id} aria-label={group.name}>
        <h4><span className={'category-mark '+group.category}/><span>{group.name}</span><small>{group.exercises.length}</small></h4>
        <div className="exercise-chips">{group.exercises.map(exercise=><button type="button" className="exercise-chip" key={exercise.id} data-exercise={exercise.id} aria-label={'添加'+exercise.name} onPointerDown={event=>onDragStart(event,{kind:'library',id:exercise.id,name:exercise.name})} onClick={()=>{if(!suppressClick())onAdd(exercise.id);}}>{exercise.name}</button>)}</div>
      </section>)}
      {!count&&<div className="empty-state compact"><Icon name="train" size={32}/><h3>没有匹配的动作</h3><p>调整部位、分组或器械筛选</p><button className="secondary" onClick={()=>setFilter(initialFilter)}>显示全部动作</button></div>}
    </div>
    <footer className="library-footer"><Icon name="info" size={16}/><span>{insertAt!==null?'插入第 '+(insertAt+1)+' 位':'拖动或点选添加'}</span>{insertAt!==null&&<button className="text-button" onClick={onCancelInsert}>取消插入</button>}</footer>
  </section>;
}
