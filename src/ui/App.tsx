import {useEffect,useState} from 'react';
import type {Plan,Session,State} from '../domain/types.ts';
import type {Backup} from '../domain/validation.ts';
import {TrainingService} from '../application/service.ts';
import {usePwa} from '../adapters/pwa.ts';
import {Home} from './pages/Home.tsx';
import {PlanEditor} from './pages/PlanEditor.tsx';
import {Follow} from './pages/Follow.tsx';
import {Settings} from './pages/Settings.tsx';
import {Icon} from './components/Icon.tsx';
import {PlanChooser} from './pages/PlanChooser.tsx';
import {Toast} from './components/Toast.tsx';
const service=new TrainingService();
export function App(){const [state,setState]=useState<State|null>(null),[fatal,setFatal]=useState(''),[editor,setEditor]=useState<{existing?:Plan}|null>(null),[follow,setFollow]=useState<Session|null>(null),[settings,setSettings]=useState(false),[chooser,setChooser]=useState(false),[busy,setBusy]=useState(false),[toast,setToast]=useState(''),[theme,setTheme]=useState(localStorage.getItem('training-follow-theme')||'system'),pwa=usePwa();
  useEffect(()=>{void service.read().then(data=>{setState(data);if(!data.onboarded&&!data.plans.length)setEditor({});}).catch(e=>setFatal(e instanceof Error?e.message:'本机数据无法读取，请重开应用。'));},[]);
  useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)'),apply=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',document.documentElement.dataset.theme==='dark'?'#11151b':'#f2f2f7');};apply();media.addEventListener('change',apply);return ()=>media.removeEventListener('change',apply);},[theme]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return ()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{const refresh=()=>{if(document.hidden||editor||follow||settings)return;void service.read().then(setState).catch(e=>setToast(e instanceof Error?e.message:'读取计划失败。'));};window.addEventListener('focus',refresh);const timer=setInterval(refresh,60000);return ()=>{window.removeEventListener('focus',refresh);clearInterval(timer);};},[editor,follow,settings]);
  async function act(work:()=>Promise<State>){setBusy(true);try{const data=await work();setState(data);return data;}finally{setBusy(false);}}
  function showError(e:unknown){setToast(e instanceof Error?e.message:'操作未完成，请重试。');}
  async function closeEditor(){try{if(!state?.onboarded)await act(()=>service.onboard());setEditor(null);}catch(e){showError(e);}}
  async function start(plan:Plan,date:string){setToast('');try{const data=await act(()=>service.begin(plan.id,date));setFollow(data.draft);}catch(e){showError(e);}}
  async function discard(){if(window.confirm('丢弃未完成的跟练？已保存的计划与训练记录会保留。')){try{await act(service.discard);}catch(e){showError(e);}}}
  async function resume(){setToast('');try{const data=await act(service.read);if(data.draft)setFollow(data.draft);else setToast('未完成的跟练已不存在，请重新选择计划。');}catch(e){showError(e);}}
  async function clearAll(revision:number){
    await act(()=>service.clearAll(revision));
    let preferencesCleared=true;
    try{localStorage.removeItem('training-follow-theme');localStorage.removeItem('training-follow-sound');}
    catch(e){preferencesCleared=false;console.info('偏好设置未清除',e instanceof Error?e.name:'StorageError');}
    setTheme('system');setSettings(false);setEditor(null);setChooser(false);
    setToast(preferencesCleared?'本机数据已删除，可重新创建计划或导入备份。':'训练数据已删除，偏好设置未能清除。请检查浏览器存储权限。');
  }
  if(fatal)return <div className="boot-state"><Icon name="info" size={36}/><h1>本机数据暂时无法读取</h1><p role="alert">{fatal}</p><button className="primary" onClick={()=>location.reload()}>重新打开</button></div>;
  if(!state)return <div className="boot-state" role="status"><span className="brand-mark"><Icon name="train"/></span><p>正在打开训练跟练…</p></div>;
  return <>{follow?<Follow key={follow.id} initial={follow} service={service} onClose={async()=>{setState(await service.read());setFollow(null);}} onFinish={async session=>{setState(await service.finish(session));setFollow(null);setToast(session.index===session.stages.length&&session.skipped.length===0?'本次训练已保存，训练看板已更新。':'本次部分训练已保存。');}}/>:<div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark"><Icon name="train"/></span><div><h1>训练跟练</h1></div></div><div className="topbar-actions"><span className="connection"><span className={pwa.offline?'offline-dot':'local-dot'}/>{pwa.offline?'离线可用':'本地保存'}</span><button className="icon-button" aria-label="打开设置" title="设置" onClick={()=>setSettings(true)}><Icon name="settings"/></button></div></header><main className="home-page"><Home state={state} busy={busy} onCreate={()=>state.plans.length?setChooser(true):setEditor({})} onEdit={existing=>setEditor({existing})} onStart={(plan,date)=>void start(plan,date)} onResume={()=>void resume()} onDiscard={()=>void discard()}/></main></div>}{chooser&&<PlanChooser state={state} busy={busy} onClose={()=>setChooser(false)} onChoose={id=>{void act(()=>service.switchPlan(id)).then(()=>{setChooser(false);setToast('已切换计划。');}).catch(showError);}} onCreate={()=>{setChooser(false);setEditor({});}}/>}{editor&&<PlanEditor existing={editor.existing} revision={state.revision} onClose={()=>void closeEditor()} onSave={async(plan,revision)=>{await act(()=>service.savePlan(plan,revision));setEditor(null);setToast('训练计划已保存。');}}/>}{settings&&<Settings state={state} theme={theme} onTheme={value=>{localStorage.setItem('training-follow-theme',value);setTheme(value);}} onClose={()=>setSettings(false)} onImport={async(backup:Backup,revision)=>{await act(()=>service.mergeBackup(backup,revision));}} onClear={clearAll} onNotify={setToast} pwa={pwa}/>}<Toast message={toast}/></>;
}
