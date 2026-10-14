import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

// A native dialog is above document stacking contexts; feedback belongs in that same layer.
export function Toast({message}:{message:string}){
  const [host,setHost]=useState<HTMLElement>(document.body);
  useEffect(()=>{
    const sync=()=>setHost([...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)??document.body);
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    sync();return ()=>observer.disconnect();
  },[]);
  return createPortal(<div className={'toast '+(message?'shown ':'')+(host.tagName==='DIALOG'?'toast-dialog':'')} role="status" aria-live="polite" aria-atomic="true">{message}</div>,host);
}
