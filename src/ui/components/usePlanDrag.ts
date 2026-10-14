import {useEffect,useRef,useState} from 'react';
import type {PointerEvent,RefObject} from 'react';
export interface DragPayload {kind:'library'|'plan';id:string;name:string}
interface Position {x:number;y:number;payload:DragPayload;index:number|null}
interface Gesture {payload:DragPayload;x:number;y:number;originX:number;originY:number;active:boolean;pointer:number;pointerType:string;target:Element}
export function usePlanDrag(scroll:RefObject<HTMLDivElement|null>,onDrop:(payload:DragPayload,index:number)=>void){
  const [drag,setDrag]=useState<Position|null>(null),current=useRef<Gesture|null>(null),suppress=useRef(false),drop=useRef(onDrop);drop.current=onDrop;
  useEffect(()=>{
    let frame=0,reset:ReturnType<typeof setTimeout>|undefined;
    function locate(){
      const state=current.current,host=scroll.current;
      if(!state?.active||!host)return null;
      const box=host.getBoundingClientRect();
      if(state.x<box.left||state.x>box.right||state.y<box.top||state.y>box.bottom)return null;
      if(state.y<box.top+54)host.scrollTop-=8;else if(state.y>box.bottom-54)host.scrollTop+=8;
      const rows=[...host.querySelectorAll<HTMLElement>('[data-item-index]')];
      return Number(rows.find(row=>state.y<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2)?.dataset.itemIndex??rows.length);
    }
    function animate(){
      const state=current.current;
      if(state?.active){setDrag({x:state.x,y:state.y,payload:state.payload,index:locate()});frame=requestAnimationFrame(animate);}
    }
    function clear(){
      const state=current.current;current.current=null;cancelAnimationFrame(frame);setDrag(null);
      if(state?.target.hasPointerCapture(state.pointer))state.target.releasePointerCapture(state.pointer);
      clearTimeout(reset);
      if(state?.active){suppress.current=true;reset=setTimeout(()=>{suppress.current=false;},100);}else suppress.current=false;
    }
    function move(event:globalThis.PointerEvent){
      const state=current.current;if(!state||event.pointerId!==state.pointer)return;
      state.x=event.clientX;state.y=event.clientY;
      const dx=state.x-state.originX,dy=state.y-state.originY;
      const verticalBrowse=state.payload.kind==='library'&&state.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx);
      if(!state.active&&!verticalBrowse&&Math.hypot(dx,dy)>8){state.active=true;suppress.current=true;frame=requestAnimationFrame(animate);}
      if(state.active)event.preventDefault();
    }
    function end(event:globalThis.PointerEvent){
      const state=current.current;if(!state||event.pointerId!==state.pointer)return;
      if(state.active){const index=locate();if(index!==null)drop.current(state.payload,index);event.preventDefault();}
      clear();
    }
    function cancel(event:globalThis.PointerEvent){if(event.pointerId===current.current?.pointer)clear();}
    function blur(){clear();}
    function key(event:KeyboardEvent){if(event.key==='Escape'&&current.current){event.preventDefault();clear();}}
    window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);window.addEventListener('keydown',key);
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);cancelAnimationFrame(frame);clearTimeout(reset);};
  },[scroll]);
  function begin(event:PointerEvent,payload:DragPayload){
    if(event.button!==0||!event.isPrimary||current.current)return;
    const target=event.currentTarget;
    current.current={payload,x:event.clientX,y:event.clientY,originX:event.clientX,originY:event.clientY,active:false,pointer:event.pointerId,pointerType:event.pointerType,target};
    if(event.nativeEvent.isTrusted)target.setPointerCapture(event.pointerId);
  }
  return {drag,begin,suppress};
}
