import {emptyState} from '../domain/types.ts';
import type {State} from '../domain/types.ts';
import {validateState} from '../domain/validation.ts';
export class Repository {
  private db:Promise<IDBDatabase>;
  constructor(){this.db=new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(new Error('无法打开本地数据库。请检查浏览器存储权限，现有数据未被删除。'));r.onblocked=()=>reject(new Error('数据库升级被另一窗口占用，请关闭其他应用窗口后重试。'));});}
  async read():Promise<State>{const db=await this.db;return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('current');r.onsuccess=()=>{try{resolve(r.result===undefined?emptyState():validateState(r.result));}catch(e){reject(e);}};tx.onabort=()=>reject(tx.error);});}
  async update(change:(state:State)=>State,expectedRevision?:number):Promise<State>{const db=await this.db;return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('current');let next:State;let reason:unknown;r.onsuccess=()=>{try{const current=r.result===undefined?emptyState():validateState(r.result);if(expectedRevision!==undefined&&current.revision!==expectedRevision)throw new Error('另一窗口已修改数据，请重新打开后再保存。');next=validateState({...change(current),...(current.schemaVersion===2?{schemaVersion:2}:{}),revision:current.revision+1});store.put(next,'current');}catch(e){reason=e instanceof DOMException?new Error('保存失败。原数据未改变，请检查存储空间或权限后重试。'):e;tx.abort();}};tx.oncomplete=()=>resolve(next!);tx.onabort=()=>reject(reason||new Error('保存失败。原有数据未改变，请检查可用存储空间后重试。'));});}
}
