import {useId} from 'react';

export function RangeField({label,sliderLabel,unit,value,min,max,step=1,stops,disabled=false,onChange}:{label:string;sliderLabel:string;unit:string;value:number;min:number;max:number;step?:number;stops?:readonly number[];disabled?:boolean;onChange:(value:number)=>void}){
  const id=useId(),safe=Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
  const index=stops?.reduce((best,n,i)=>Math.abs(n-safe)<Math.abs(stops[best]-safe)?i:best,0)??0,display=stops?.[index]??safe;
  return <div className="range-field"><label htmlFor={id}>{label.replace(/（[^）]*）/g,'')}</label><input id={id} type="range" min={stops?0:min} max={stops?stops.length-1:max} step={stops?1:step} value={stops?index:safe} data-stops={stops?.join(',')} disabled={disabled} aria-label={sliderLabel} aria-valuemin={stops?min:undefined} aria-valuemax={stops?max:undefined} aria-valuenow={stops?display:undefined} aria-valuetext={`${display} ${unit}`} onChange={e=>onChange(stops?.[Number(e.target.value)]??Number(e.target.value))}/><output htmlFor={id} aria-hidden="true"><strong>{display}</strong><span>{unit}</span></output></div>;
}
