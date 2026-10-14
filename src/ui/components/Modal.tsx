import {useEffect,useId,useRef} from 'react';
import type {ReactNode} from 'react';
import {Icon} from './Icon.tsx';

export function Modal({title,onClose,children,wide=false,busy=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;busy?:boolean}){
  const ref=useRef<HTMLDialogElement>(null),heading=useId();
  useEffect(()=>{
    const dialog=ref.current!,previous=document.activeElement as HTMLElement|null;
    dialog.showModal();
    return ()=>{
      if(dialog.open)dialog.close();
      if(previous?.isConnected&&previous!==document.body&&previous!==document.documentElement)previous.focus();
      else (document.querySelector<HTMLButtonElement>('main .primary:not(:disabled)')??document.querySelector<HTMLButtonElement>('main button:not(:disabled)'))?.focus();
    };
  },[]);
  return <dialog ref={ref} aria-labelledby={heading} aria-busy={busy||undefined} className={'modal '+(wide?'wide':'')} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <header className="modal-header"><h2 id={heading}>{title}</h2><button type="button" className="icon-button" disabled={busy} aria-label={'关闭'+title} title="关闭" onClick={onClose}><Icon name="close"/></button></header>
    <div className="modal-body">{children}</div>
  </dialog>;
}
