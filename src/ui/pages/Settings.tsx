import {useEffect,useRef,useState} from 'react';
import type {State} from '../../domain/types.ts';
import {parseBackup} from '../../domain/validation.ts';
import type {Backup} from '../../domain/validation.ts';
import type {usePwa} from '../../adapters/pwa.ts';
import {sources} from '../../content/exercises.ts';
import {Modal} from '../components/Modal.tsx';
import {Icon} from '../components/Icon.tsx';
import {SegmentedChoice} from '../components/SegmentedChoice.tsx';
export function Settings({state,theme,onTheme,onClose,onImport,onNotify,pwa}:{state:State;theme:string;onTheme:(theme:string)=>void;onClose:()=>void;onImport:(backup:Backup,revision:number)=>Promise<void>;onNotify:(text:string)=>void;pwa:ReturnType<typeof usePwa>}){
  const [sound,setSound]=useState(localStorage.getItem('training-follow-sound')!=='off'),[backup,setBackup]=useState<Backup|null>(null),[revision,setRevision]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[fileName,setFileName]=useState(''),selection=useRef(0);
  useEffect(()=>()=>{selection.current++;},[]);
  function exportData(){const blob=new Blob([JSON.stringify({app:'training-follow',schemaVersion:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`训练跟练备份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);onNotify('备份已导出。');}
  async function choose(file:File|undefined){
    const request=++selection.current;
    setError('');setBackup(null);setFileName('');
    if(!file)return;
    try{
      if(!file.name.toLowerCase().endsWith('.json')||file.size>5*1024*1024)throw new Error('请选择不超过 5 MB 的 JSON 备份。');
      const result=parseBackup(await file.text());
      if(request!==selection.current)return;
      setBackup(result);setRevision(state.revision);setFileName(file.name);
    }catch(e){if(request===selection.current)setError(e instanceof Error?e.message:'无法读取备份。');}
  }

  async function merge(){if(!backup)return;setBusy(true);setError('');try{await onImport(backup,revision);setBackup(null);onNotify('备份已合并，本机同名标识的记录已保留。');}catch(e){setError(e instanceof Error?e.message:'导入失败，本机数据未改变。');}finally{setBusy(false);}}
  return <Modal title="设置" busy={busy} onClose={()=>{if(!busy)onClose();}}><div className="settings-content"><section><h3>外观</h3><SegmentedChoice label="主题" value={theme} options={[{value:'system',label:'跟随系统'},{value:'light',label:'浅色'},{value:'dark',label:'深色'}]} onChange={onTheme}/><label className="switch-row"><span><strong>阶段提示音</strong><small>动作切换时播放短提示</small></span><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);localStorage.setItem('training-follow-sound',e.target.checked?'on':'off');}}/></label></section><section><h3>数据备份</h3><p className="muted">计划与跟练记录保存在当前浏览器中。</p><div className="action-row"><button className="secondary" disabled={busy} onClick={exportData}><Icon name="download" size={18}/>导出备份</button><label className={'secondary file-button '+(busy||state.draft?'disabled':'')} aria-disabled={busy||!!state.draft}><Icon name="upload" size={18}/>选择备份<input type="file" aria-label="选择备份文件" accept=".json,application/json" disabled={busy||!!state.draft} onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/></label></div>{state.draft&&<p className="tiny-note">结束跟练后可导入备份。</p>}{backup&&<div className="import-preview"><h4>导入预览</h4><p className="import-filename">{fileName}</p><p>计划 {backup.state.plans.length} 份 · 训练记录 {backup.state.workouts.length} 条</p><p className="muted">新增 {backup.state.plans.filter(p=>!state.plans.some(x=>x.id===p.id)).length} 份计划；已有标识的内容保留本机版本。未结束的跟练不会导入。</p><div className="action-row"><button className="secondary" disabled={busy} onClick={()=>setBackup(null)}>取消</button><button className="primary" disabled={busy} onClick={()=>void merge()}>确认合并</button></div></div>}{error&&<p className="error-text" role="alert">{error}</p>}</section><section><h3>安装与离线</h3><p className="muted">{pwa.offline?'当前离线，已缓存内容和本机数据可继续使用。':'联网打开一次后，可离线使用已缓存的应用。'}</p>{pwa.failure&&<p className="error-text" role="alert">{pwa.failure}</p>}{pwa.canInstall?<button className="secondary full" onClick={()=>void pwa.requestInstall()}>安装训练跟练</button>:<p className="tiny-note">iPad：用 Safari 打开后，在分享菜单中选择“添加到主屏幕”。</p>}{pwa.waiting&&<button className="primary full" disabled={busy||!!state.draft} onClick={pwa.update}>{state.draft?'结束跟练后可更新':'更新应用'}</button>}</section><section className="source-notes"><h3>动作资料</h3><p className="muted">动作库分为有氧与力量（无氧）。默认参数可自行调整；计次动作不会自动判定完成。</p><div className="source-links"><a href={sources.warmup} target="_blank" rel="noreferrer">热身指南</a><a href={sources.strength} target="_blank" rel="noreferrer">力量指南</a><a href={sources.stretch} target="_blank" rel="noreferrer">拉伸指南</a><a href={sources.aerobic} target="_blank" rel="noreferrer">有氧指南</a><a href="https://www.acefitness.org/resources/everyone/exercise-library/" target="_blank" rel="noreferrer">运动协会动作库</a><a href="https://www.nasm.org/resource-center/exercise-library" target="_blank" rel="noreferrer">运动医学动作库</a></div></section><p className="tiny-note">训练跟练 1.0.0 · 正式版</p></div></Modal>;
}
