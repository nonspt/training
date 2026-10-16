// Do not persist a new format while an older worker still serves the offline app.
export async function ensureAdvancedOfflineSupport(){
  if(!('serviceWorker' in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration();if(!registration)return;
  const worker=navigator.serviceWorker.controller??registration.active;
  if(!worker)return; // First installation has no older offline shell to fall back to.
  const supported=await new Promise<boolean>(resolve=>{
    const channel=new MessageChannel();
    const done=(value:boolean)=>{clearTimeout(timeout);channel.port1.close();resolve(value);};
    const timeout=setTimeout(()=>done(false),1200);
    channel.port1.onmessage=event=>done(event.data?.schemaVersion===2);
    worker.postMessage({type:'STORAGE_FORMAT'},[channel.port2]);
  });
  if(!supported)throw new Error('离线资源仍是旧版。请取消编辑，在设置中更新应用后再保存；原数据未改变。');
}
