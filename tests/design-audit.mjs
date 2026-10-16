import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {selectLibraryFor} from './library-helpers.mjs';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1133,height:744},screen:{width:1133,height:744},hasTouch:true,isMobile:true,deviceScaleFactor:2,colorScheme:'light'});
const page=await context.newPage(),errors=[],results=[],measurements=[];
page.on('pageerror',e=>errors.push(e.message));
const url=process.env.APP_URL||'http://localhost:5190/';
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}));

async function audit(label){
  const report=await page.evaluate(()=>{
    const host=document.querySelector('dialog[open]')||document.querySelector('main'),issues=[],modules=[...host.querySelectorAll('.module')];
    if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');
    for(const node of modules){const r=node.getBoundingClientRect();if(r.x<-1||r.right>innerWidth+1||r.y<-1||r.bottom>innerHeight+1||node.scrollWidth>node.clientWidth+1)issues.push('module bounds '+node.className);}
    const library=host.querySelector('.library-module'),plan=host.querySelector('.plan-module');
    if(library){
      const phone=matchMedia('(max-width:600px) and (orientation:portrait)').matches;
      if(phone){
        const visible=[library,plan].filter(node=>node.getBoundingClientRect().width>0);
        if(visible.length!==1||Math.abs(visible[0].getBoundingClientRect().width-host.querySelector('.compact-editor').clientWidth)>1)issues.push('phone editor must use one full-width module');
      }else if(Math.abs(library.getBoundingClientRect().width-plan.getBoundingClientRect().width)>1)issues.push('unequal editor modules');
    }
    for(const node of host.querySelectorAll('h1,h2,h3,h4,.eyebrow'))if(/[A-Za-z]/.test(node.textContent))issues.push('English heading '+node.textContent);
    for(const node of host.querySelectorAll('h1,h2,h3,h4,p,label,button,select,summary,small')){
      const r=node.getBoundingClientRect();if(!r.width||!r.height||node.closest('.sr-only')||!node.textContent.trim())continue;
      const scroller=node.closest('.internal-scroll,.modal-body,.library-controls,.plan-meta');
      if(scroller){const b=scroller.getBoundingClientRect();if(r.top>b.bottom||r.bottom<b.top)continue;}
      if(parseFloat(getComputedStyle(node).fontSize)<11.5)issues.push('small type '+node.textContent.slice(0,20));
      if(r.x<-1||r.right>innerWidth+1)issues.push('text width '+node.tagName);
    }
    for(const node of host.querySelectorAll('button.icon-button'))if(!node.getAttribute('aria-label'))issues.push('unlabelled icon button');
    for(const icon of host.querySelectorAll('svg.app-icon')){
      if(icon.getAttribute('viewBox')!=='0 0 24 24'||icon.getAttribute('stroke-width')!=='2'||icon.getAttribute('stroke')!=='currentColor'||icon.getAttribute('aria-hidden')!=='true')issues.push('SVG contract '+icon.dataset.icon);
      const b=icon.getBBox();if(b.width&&(b.x<2.9||b.y<2.9||b.x+b.width>21.1||b.y+b.height>21.1))issues.push('SVG padding '+icon.dataset.icon);
    }
    return {issues,moduleCount:modules.length};
  });
  assert.deepEqual(report.issues,[],label);measurements.push({label,...report});
}
async function range(name,value){await page.getByRole('slider',{name,exact:true}).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function touch(from,to){
  const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}]});await page.waitForTimeout(20);}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();await page.waitForTimeout(120);
}
try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(url);await page.getByRole('dialog',{name:'创建计划',exact:true}).waitFor();
  for(const [width,height] of [[1133,744],[1133,650],[744,1133],[567,744],[390,844],[1133,440]]){await page.setViewportSize({width,height});await audit('编辑器 '+width+'×'+height);}
  await page.setViewportSize({width:1133,height:744});
  const button=await page.locator('[data-exercise="barbell-squat"]').boundingBox(),start={x:button.x+button.width/2,y:button.y+button.height/2};
  await touch(start,{x:start.x,y:start.y-180});const scrolled=await page.locator('.library-scroll').evaluate(n=>n.scrollTop);
  assert.ok(scrolled>80,'vertical touch over a chip must scroll the library');assert.equal(await page.locator('.plan-item').count(),0);assert.equal(await page.locator('.drag-ghost').count(),0);measurements.push({label:'纵向触控浏览',scrollTop:scrolled});
  await page.locator('.library-scroll').evaluate(n=>n.scrollTop=0);
  await selectLibraryFor(page,'march');
  const chip=await page.locator('[data-exercise="march"]').boundingBox(),timeline=await page.locator('[data-plan-scroll]').boundingBox();
  await touch({x:chip.x+chip.width/2,y:chip.y+chip.height/2},{x:timeline.x+timeline.width/2,y:timeline.y+timeline.height/2});assert.equal(await page.locator('.plan-item').count(),1);
  const beforeCancel=await page.locator('.plan-item').count();await page.mouse.move(chip.x+chip.width/2,chip.y+chip.height/2);await page.mouse.down();await page.mouse.move(timeline.x+30,timeline.y+80,{steps:8});await page.locator('.drag-ghost').waitFor();await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(150);assert.equal(await page.getByRole('dialog',{name:'创建计划'}).count(),1);assert.equal(await page.locator('.drag-ghost').count(),0);assert.equal(await page.locator('.plan-item').count(),beforeCancel);
  results.push('纵向触控浏览、横向拖入、取消拖动不误添加且保留编辑器');

  await selectLibraryFor(page,'barbell-deadlift');
  await page.locator('[data-exercise="barbell-deadlift"]').focus();await page.keyboard.press('Enter');const weight=page.getByRole('slider',{name:'调节杠铃硬拉重量',exact:true});await weight.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');assert.equal(await weight.inputValue(),'199.5');
  for(const fontSize of ['16px','32px']){
    await page.evaluate(size=>document.documentElement.style.fontSize=size,fontSize);await audit(fontSize+' 编辑器');
    const overlaps=await page.locator('.expanded .range-field').evaluateAll(fields=>fields.flatMap(field=>{const input=field.querySelector('input').getBoundingClientRect(),output=field.querySelector('output').getBoundingClientRect(),text=field.querySelector('output strong').getBoundingClientRect();return text.x<input.right-1||text.right>output.right+1?['range value overlap']:[];}));assert.deepEqual(overlaps,[],fontSize);
  }
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));await page.locator('.movement-details summary').click();await page.locator('.movement-source').waitFor({state:'visible'});await audit('展开 SVG 动作参考');await page.locator('.movement-details summary').click();
  for(const [type,id] of [['strength','plank'],['aerobic','cycle'],['aerobic','standing-rest']]){await selectLibraryFor(page,id);await page.locator('[data-exercise="'+id+'"]').click();}
  await page.getByLabel('计划名称',{exact:true}).fill('全应用设计验收');await page.screenshot({path:'test-results/design-editor-light.png'});
  results.push('命名弹窗、图标语义与几何、键盘添加/滑块、200% 字号参数不重叠');

  await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state');window.releaseAuditWrite=false;function hold(){const q=store.get('current');q.onsuccess=()=>{if(!window.releaseAuditWrite)hold();};}hold();tx.oncomplete=()=>db.close();window.releaseAuditTransaction=()=>{window.releaseAuditWrite=true;};resolve();};r.onerror=()=>reject(r.error);}));
  await page.getByRole('button',{name:'完成设计',exact:true}).click();await page.waitForFunction(()=>document.querySelector('dialog')?.getAttribute('aria-busy')==='true');assert.equal(await page.getByRole('button',{name:'关闭创建计划',exact:true}).isDisabled(),true);assert.equal(await page.locator('.editor-grid').evaluate(n=>n.inert),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'创建计划'}).count(),1);await page.evaluate(()=>window.releaseAuditTransaction());await page.getByRole('dialog',{name:'创建计划'}).waitFor({state:'hidden'});await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'进入跟练',exact:true}).evaluate(n=>n===document.activeElement),true);assert.equal((await read()).plans[0].items.length,5);
  await audit('首页');await page.screenshot({path:'test-results/design-home-light.png'});await page.getByRole('button',{name:'更换计划',exact:true}).click();await page.getByRole('dialog',{name:'更换计划'}).waitFor();await audit('计划列表');await page.keyboard.press('Escape');
  results.push('保存期间锁定控件与关闭操作，保存后焦点返回主要动作，训练看板与计划列表');

  await page.getByRole('button',{name:'打开设置'}).click();await page.getByRole('dialog',{name:'设置',exact:true}).waitFor();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();const backup=await fs.readFile(await (await downloading).path(),'utf8');await page.locator('dialog .toast.shown').waitFor();assert.equal(await page.locator('dialog .toast').evaluate(n=>getComputedStyle(n).position),'static');
  const beforeImport=await read();await page.evaluate(()=>{window.auditBlobText=Blob.prototype.text;Blob.prototype.text=async function(){if(this.name==='slow.json')await new Promise(resolve=>setTimeout(resolve,350));return window.auditBlobText.call(this);};});
  await page.getByLabel('选择备份文件').setInputFiles({name:'slow.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.getByLabel('选择备份文件').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});await page.waitForTimeout(500);assert.equal(await page.locator('.import-preview').count(),0);await page.getByRole('alert').waitFor();assert.equal((await read()).revision,beforeImport.revision);
  await page.getByLabel('选择备份文件').setInputFiles({name:'当前选择.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.locator('.import-filename').filter({hasText:'当前选择.json'}).waitFor();await page.getByRole('button',{name:'确认合并',exact:true}).click();await page.locator('.import-preview').waitFor({state:'hidden'});assert.equal((await read()).plans.length,1);await page.evaluate(()=>{Blob.prototype.text=window.auditBlobText;});await audit('设置与备份');await page.screenshot({path:'test-results/design-settings-light.png'});
  results.push('原生弹窗内可见反馈，快速更换文件只显示最新预览，错误保留数据且合并去重');

  await page.evaluate(()=>{const event=new Event('beforeinstallprompt');window.auditInstallRetry=false;event.prompt=async()=>{if(!window.auditInstallRetry)throw new Error('Audit install failure');};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});await page.getByRole('button',{name:'安装训练跟练',exact:true}).click();await page.getByRole('alert').filter({hasText:'安装未完成'}).waitFor();await page.evaluate(()=>{window.auditInstallRetry=true;});await page.getByRole('button',{name:'安装训练跟练',exact:true}).click();await page.getByRole('button',{name:'安装训练跟练',exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByRole('alert').filter({hasText:'安装未完成'}).count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'打开设置'}).evaluate(n=>n===document.activeElement),true);results.push('安装异常有可恢复反馈，关闭弹窗返回原按钮焦点');

  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await audit('深色首页');await page.screenshot({path:'test-results/design-home-dark.png'});await page.getByRole('button',{name:'编辑计划',exact:true}).click();await audit('深色编辑器');await page.getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).click();await page.getByRole('button',{name:'开始跟练',exact:true}).waitFor();
  assert.equal(new Set(await page.locator('[data-progress-stage]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color))).size,5);await page.waitForTimeout(100);assert.equal(await page.locator('.toast.shown').count(),0);await audit('深色跟练');await page.screenshot({path:'test-results/design-follow-dark.png'});
  for(const [width,height] of [[1133,650],[744,1133],[567,744],[390,844],[1133,440]]){await page.setViewportSize({width,height});await audit('跟练 '+width+'×'+height);}
  await page.setViewportSize({width:1133,height:744});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await audit('200% 跟练');await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await audit('浅色跟练');await page.screenshot({path:'test-results/design-follow-light.png'});await page.getByRole('button',{name:'保存进度并返回首页'}).click();
  results.push('五阶段色条、反馈不遮挡跟练操作、浅/深色和各尺寸/200% 跟练模块内滚动');

  assert.deepEqual(errors,[]);await fs.writeFile('test-results/design-audit-report.json',JSON.stringify({results,measurements,pageErrors:errors},null,2));console.log(JSON.stringify({passed:results.length,results},null,2));
}catch(error){await page.screenshot({path:'test-results/design-audit-failure.png'});await fs.writeFile('test-results/design-audit-failure.json',JSON.stringify({message:error.message,errors},null,2));throw error;}finally{await browser.close();}
