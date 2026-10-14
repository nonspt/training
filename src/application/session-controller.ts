import type {Session} from '../domain/types.ts';
import {advance,tick} from '../domain/session.ts';
export class SessionController {
  session:Session;running=false;error='';ready=false;
  private timer:ReturnType<typeof setInterval>|undefined;private last=0;private savedAt=0;private saving=Promise.resolve();private release:(()=>void)|undefined;private disposed=false;
  constructor(session:Session,private save:(s:Session)=>Promise<unknown>,private notify:()=>void,private feedback:()=>void){this.session=structuredClone(session);}
  async acquire(){if(!navigator.locks){this.error='当前浏览器不支持安全跟练，请使用新版 Safari 或 Chrome。';this.notify();return;}await new Promise<void>(resolve=>{void navigator.locks.request('training-follow-session',{ifAvailable:true},async lock=>{if(!lock){this.error='另一窗口正在跟练，请先退出该窗口。';this.notify();resolve();return;}this.ready=true;this.notify();resolve();await new Promise<void>(done=>{this.release=done;if(this.disposed)done();});}).catch(e=>{this.error=e instanceof Error?e.message:'无法启动跟练。';this.notify();resolve();});});}
  start(){if(!this.ready||this.error||this.session.index>=this.session.stages.length)return;this.running=true;this.last=performance.now();this.savedAt=this.last;this.timer=setInterval(()=>this.step(),100);this.notify();}
  private step(){const now=performance.now(),delta=(now-this.last)/1000;this.last=now;if(delta>2.5||document.hidden){this.pause();return;}const previous=this.session.index;this.session=tick(this.session,delta);if(previous!==this.session.index){this.feedback();this.persist();}if(now-this.savedAt>5000){this.savedAt=now;this.persist();}if(this.session.index>=this.session.stages.length)this.pause();this.notify();}
  pause(){this.running=false;clearInterval(this.timer);this.timer=undefined;this.persist();this.notify();}
  next(skip=false){if(!this.ready||this.error)return;this.session=advance(this.session,skip);this.feedback();this.persist();if(this.session.index>=this.session.stages.length)this.pause();this.notify();}
  private persist(){const snapshot=structuredClone(this.session);this.saving=this.saving.then(async()=>{if(this.error)return;try{await this.save(snapshot);}catch(e){this.error=e instanceof Error?e.message:'保存跟练失败，请保留当前页面并重试。';this.running=false;clearInterval(this.timer);this.notify();}});}
  async flush(){this.pause();await this.saving;if(this.error)throw new Error(this.error);return this.session;}
  async retrySave(){if(!this.ready)return;this.error='';this.persist();await this.saving;this.notify();}
  async dispose(){this.disposed=true;clearInterval(this.timer);this.running=false;await this.saving;this.release?.();}
}
