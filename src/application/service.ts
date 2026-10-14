import type {Plan,Session} from '../domain/types.ts';
import {Repository} from '../repositories/repository.ts';
import {validatePlan,validateSession} from '../domain/validation.ts';
import type {Backup} from '../domain/validation.ts';
import {exercises} from '../content/exercises.ts';
import {buildStages} from '../domain/plans.ts';
import {newSession,workoutFrom} from '../domain/session.ts';
export class TrainingService {
  constructor(public repository=new Repository()){}
  read=()=>this.repository.read();
  onboard=()=>this.repository.update(s=>({...s,onboarded:true}));
  savePlan(plan:Plan,revision:number){const valid=validatePlan(plan);return this.repository.update(s=>{if(s.draft)throw new Error('请先结束或丢弃尚未完成的跟练，再编辑计划。');return {...s,onboarded:true,activePlanId:valid.id,plans:[...s.plans.filter(p=>p.id!==valid.id),valid]};},revision);}
  begin(planId:string,date:string){return this.repository.update(s=>{if(s.draft)return s;const plan=s.plans.find(p=>p.id===planId);if(!plan)throw new Error('计划已改变，请刷新后重试。');return {...s,draft:newSession(plan,date,buildStages(plan,exercises))};});}
  saveDraft(session:Session){const valid=validateSession(session);return this.repository.update(s=>{if(s.draft?.id!==session.id)throw new Error('跟练已经在另一窗口结束，请返回首页。');return {...s,draft:valid};});}
  finish(session:Session){return this.repository.update(s=>{if(s.workouts.some(w=>w.id===session.id))return s;if(s.draft?.id!==session.id)throw new Error('跟练已改变，请返回首页。');return {...s,draft:null,workouts:[...s.workouts,workoutFrom(session)]};});}
  discard=async()=>{if(!navigator.locks)return this.repository.update(s=>({...s,draft:null}));return navigator.locks.request('training-follow-session',{ifAvailable:true},async lock=>{if(!lock)throw new Error('另一窗口正在跟练，请先退出该窗口，再丢弃草稿。');return this.repository.update(s=>({...s,draft:null}));});};
  switchPlan(id:string){return this.repository.update(s=>{if(s.draft)throw new Error('请先结束当前跟练，再切换计划。');if(!s.plans.some(p=>p.id===id))throw new Error('计划无法找到，请重新打开列表。');return {...s,activePlanId:id};});}
  async mergeBackup(backup:Backup,revision:number){return this.repository.update(s=>{if(s.draft)throw new Error('请先结束当前跟练，再导入备份。');const localIds=new Set(s.plans.map(p=>p.id)),workoutIds=new Set(s.workouts.map(w=>w.id));return {...s,onboarded:true,plans:[...s.plans,...backup.state.plans.filter(p=>!localIds.has(p.id))],workouts:[...s.workouts,...backup.state.workouts.filter(w=>!workoutIds.has(w.id))],activePlanId:s.activePlanId??backup.state.activePlanId,draft:null};},revision);}
}
