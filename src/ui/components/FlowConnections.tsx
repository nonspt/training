import {useEffect,useId,useState} from 'react';
import type {RefObject} from 'react';
import './FlowConnections.css';

type Connection={path:string;kind:'across'|'wrap'|'down'};
type Drawing={width:number;height:number;connections:Connection[]};
type Box={left:number;right:number;top:number;bottom:number;width:number;height:number};
const round=(n:number)=>Math.round(n*100)/100;

function connection(a:Box,b:Box,width:number,horizontal:boolean):Connection{
  if(!horizontal)return {kind:'down',path:`M ${round(a.left+a.width/2)} ${round(a.bottom)} V ${round(b.top)}`};
  const x1=round(a.right),y1=round(a.top+a.height/2),x2=round(b.left),y2=round(b.top+b.height/2);
  if(Math.abs(a.top-b.top)<1)return {kind:'across',path:`M ${x1} ${y1} H ${x2}`};
  const right=round((a.right+width)/2),left=round(b.left/2),middle=round((a.bottom+b.top)/2);
  const radius=round(Math.min(8,right-x1,x2-left,(middle-y1)/2,(y2-middle)/2));
  return {kind:'wrap',path:`M ${x1} ${y1} H ${right-radius} Q ${right} ${y1} ${right} ${y1+radius} V ${middle-radius} Q ${right} ${middle} ${right-radius} ${middle} H ${left+radius} Q ${left} ${middle} ${left} ${middle+radius} V ${y2-radius} Q ${left} ${y2} ${left+radius} ${y2} H ${x2}`};
}

/** Decorative routes follow the measured cards; the ordered list carries meaning. */
export function FlowConnections({hostRef,layoutKey,layout='column'}:{hostRef:RefObject<HTMLElement|null>;layoutKey:string;layout?:'grid'|'column'}){
  const arrowId='flow-arrow-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const [drawing,setDrawing]=useState<Drawing>({width:0,height:0,connections:[]});
  useEffect(()=>{
    const host=hostRef.current;
    if(!host)return;
    const nodes=Array.from(host.querySelectorAll<HTMLElement>('[data-flow-node]'));
    const measure=()=>{
      const bounds=host.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return;
      const boxes=nodes.map(node=>{
        const r=node.getBoundingClientRect();
        return {left:r.left-bounds.left,right:r.right-bounds.left,top:r.top-bounds.top,bottom:r.bottom-bounds.top,width:r.width,height:r.height};
      });
      const horizontal=layout==='grid'&&boxes.length>1&&Math.abs(boxes[0].top-boxes[1].top)<1;
      const next={width:bounds.width,height:bounds.height,connections:boxes.slice(0,-1).map((box,i)=>connection(box,boxes[i+1],bounds.width,horizontal))};
      setDrawing(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
    };
    const observer=new ResizeObserver(measure);
    observer.observe(host,{box:'border-box'});nodes.forEach(node=>observer.observe(node));
    // Timeline centering changes padding without changing the content box.
    const insets=new MutationObserver(measure);
    insets.observe(host,{attributes:true,attributeFilter:['style']});measure();
    return ()=>{observer.disconnect();insets.disconnect();};
  },[hostRef,layoutKey,layout]);
  if(!drawing.connections.length)return null;
  return <svg className="flow-connections" width={drawing.width} height={drawing.height} viewBox={`0 0 ${drawing.width} ${drawing.height}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <defs><marker id={arrowId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="m1 1 6 3-6 3" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="none"/></marker></defs>
    {drawing.connections.map((line,i)=><path key={i} d={line.path} markerEnd={`url(#${arrowId})`} data-flow-from={i} data-flow-to={i+1} data-flow-kind={line.kind}/>)}
  </svg>;
}
