import type {Session} from './types.ts';

// Each snapshot stage occupies one segment. Count targets advance on confirmation only.
export function sessionProgress(session:Pick<Session,'stages'|'index'|'stageElapsed'>){
  const total=session.stages.length;
  if(!total)return {percent:0,currentFraction:0};
  const current=session.stages[session.index];
  const currentFraction=current?.mode==='time'?Math.max(0,Math.min(1,session.stageElapsed/current.seconds)):0;
  return {percent:Math.max(0,Math.min(100,(session.index+currentFraction)/total*100)),currentFraction};
}
