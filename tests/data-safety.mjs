import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {exercises,findExercise} from '../src/content/exercises.ts';
import {buildStages,createItem,today} from '../src/domain/plans.ts';
import {newSession} from '../src/domain/session.ts';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1133,height:744},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'light'}),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const url=process.env.APP_URL||'http://localhost:5190/',date=today(),stamp=new Date().toISOString();
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}));
async function write(state){await page.evaluate(state=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),state);}
async function seed(index=null,records=false){
  const items=[createItem(findExercise('march')),{...createItem(findExercise('db-row')),sets:3,rest:30,weight:8,reps:10},{...createItem(findExercise('db-row')),sets:1,weight:8,reps:10},{...createItem(findExercise('cycle')),effort:16,sets:1}];
  const plan={id:'data-safety',name:'完整时间线与删除验收',type:'mixed',weeks:4,days:[0,1,2,3,4,5,6],startDate:date,items,createdAt:stamp,updatedAt:stamp,version:1};
  const stages=buildStages(plan,exercises),draft=index===null?null:{...newSession(plan,date,stages),index,elapsed:index*30,completed:stages.slice(0,index).map(s=>s.id)};
  const workouts=records?[{id:'saved-workout',planId:plan.id,planName:plan.name,scheduledDate:date,finishedAt:stamp,elapsed:30,completed:false,completedStages:1,totalStages:stages.length,confirmedReps:0}]:[];
  const state={schemaVersion:1,revision:1,onboarded:true,plans:[plan],activePlanId:plan.id,draft,workouts};
  await write(state);await page.reload();await page.getByRole('button',{name:index===null?'进入跟练':'继续跟练',exact:true}).waitFor();return {state,plan,stages};
}
async function openSettings(){await page.getByRole('button',{name:'打开设置'}).click();await page.getByRole('dialog',{name:'设置',exact:true}).waitFor();}
async function openDelete(){await openSettings();await page.getByRole('button',{name:'删除所有数据',exact:true}).click();await page.getByRole('dialog',{name:'删除所有数据',exact:true}).waitFor();}
async function approveDelete(){await page.getByLabel('我了解删除后仅可通过已有备份恢复',{exact:true}).check();await page.getByRole('button',{name:'确认删除全部数据',exact:true}).click();}
async function cancelDelete(){await page.getByRole('button',{name:'取消删除',exact:true}).click();await page.getByRole('button',{name:'关闭设置',exact:true}).click();}
async function returnHome(){await page.getByRole('button',{name:'保存进度并返回首页'}).click();await page.getByRole('button',{name:'继续跟练',exact:true}).waitFor();}
async function arrowAudit(){
  const issues=await page.evaluate(()=>{
    const paths=[...document.querySelectorAll('.flow-connections path[data-flow-from]')],issues=[];
    for(const path of paths){const marker=path.getAttribute('marker-end'),id=marker?.match(/^url\(#(.+)\)$/)?.[1],node=id&&document.getElementById(id);if(!node||node.tagName.toLowerCase()!=='marker'||node.getAttribute('orient')!=='auto'||!node.querySelector('path'))issues.push('missing incoming arrow');}
    return issues;
  });assert.deepEqual(issues,[]);
}
try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(url);
  const fixture=await seed();await page.waitForFunction(()=>document.querySelectorAll('.home-movement').length===8);
  assert.deepEqual(await page.locator('.home-movement-copy strong').allTextContents(),fixture.stages.map(s=>s.name));
  assert.equal(await page.locator('.home-movement small,.home-movement p').count(),0);
  assert.deepEqual(await page.locator('.home-order').allTextContents(),fixture.stages.map((_,i)=>String(i+1).padStart(2,'0')));
  assert.equal(await page.locator('.home-movement-copy strong').filter({hasText:'单臂哑铃划船'}).count(),4);
  await arrowAudit();assert.equal(await page.locator('.home-movement-grid path[data-flow-from]').count(),7);
  const gaps=await page.locator('.home-movement-grid').evaluate(n=>({row:parseFloat(getComputedStyle(n).rowGap),column:parseFloat(getComputedStyle(n).columnGap)}));assert.ok(gaps.row>=36);assert.equal(gaps.column,44);
  await page.locator('.plan-card-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);const last=await page.locator('.home-movement').last().boundingBox(),host=await page.locator('.plan-card-scroll').boundingBox();assert.ok(last.y>=host.y&&last.y+last.height<=host.y+host.height+1);
  results.push('完整时间线逐组/逐段显示，重复动作不合并，只保留名称编号；箭头与更大纵向间距正确');

  await page.getByRole('button',{name:'编辑计划',exact:true}).click();await page.locator('.item-toggle').filter({hasText:'健身车骑行'}).click();
  const slider=page.getByRole('slider',{name:'调节健身车骑行主观用力',exact:true});assert.equal(await slider.getAttribute('max'),'16');assert.equal(await slider.inputValue(),'16');
  await page.getByRole('button',{name:'保存修改',exact:true}).click();assert.equal((await read()).plans[0].items.at(-1).effort,16);
  const weighted=await seed(1);await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.locator('.follow-details').waitFor();
  assert.equal((await page.locator('.target-reading').innerText()).replace(/\s/g,''),'8kg');assert.match(await page.locator('.detail-facts').first().innerText(),/10 次/);
  assert.equal(await page.locator('.next-movement').innerText(),'组间休息');assert.equal(await page.locator('.next-effort strong').innerText(),'1 / 16');assert.match(await page.locator('.after-next').innerText(),/单臂哑铃划船/);assert.match(await page.locator('.after-next').innerText(),/第 2 组/);
  const fixed=await page.locator('.target-card').boundingBox();await arrowAudit();await page.screenshot({path:'test-results/v15-weighted-details.png'});await returnHome();
  await seed(weighted.stages.length-1);await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.getByRole('meter',{name:'计划主观用力目标'}).waitFor();
  assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).getAttribute('aria-valuemax'),'16');assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).getAttribute('aria-valuenow'),'16');assert.equal(await page.locator('.effort-meter>.filled').count(),16);
  assert.ok(Math.abs((await page.locator('.target-card').boundingBox()).height-fixed.height)<1);await page.screenshot({path:'test-results/v15-effort16-details.png'});await returnHome();
  await seed(weighted.stages.length-2);await page.getByRole('button',{name:'继续跟练',exact:true}).click();assert.equal(await page.locator('.next-effort strong').innerText(),'16 / 16');await returnHome();
  results.push('编辑/保存/快照支持用力16；右侧卡片补充真实目标、器械、准备与后续环节，外框尺寸不变');

  const original=await seed(1,true);await page.evaluate(()=>{localStorage.setItem('training-follow-theme','dark');localStorage.setItem('training-follow-sound','off');localStorage.setItem('other-app-sentinel','preserve');});await page.reload();
  await openSettings();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloading,backupText=await fs.readFile(await download.path(),'utf8');assert.equal(JSON.parse(backupText).state.plans[0].items.at(-1).effort,16);assert.equal(JSON.parse(backupText).state.draft.stages.at(-1).effort,16);await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  await openDelete();assert.equal(await page.getByRole('button',{name:'确认删除全部数据',exact:true}).isDisabled(),true);await page.screenshot({path:'test-results/v15-delete-confirmation.png'});await cancelDelete();assert.deepEqual(await read(),original.state);
  await openDelete();await page.evaluate(()=>{window.savedPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('测试存储失败','QuotaExceededError');};});await approveDelete();await page.getByRole('alert').filter({hasText:'原数据未改变'}).waitFor();assert.deepEqual(await read(),original.state);assert.equal(await page.evaluate(()=>localStorage.getItem('training-follow-sound')),'off');await page.evaluate(()=>{IDBObjectStore.prototype.put=window.savedPut;});await cancelDelete();
  results.push('删除前需范围预览与二次确认；取消和注入事务失败均保留全部数据与偏好');

  await openDelete();const changed=await read();changed.revision++;changed.plans[0].name='另一窗口刚保存的计划';await write(changed);await approveDelete();await page.getByRole('alert').filter({hasText:'另一窗口改变'}).waitFor();assert.deepEqual(await read(),changed);await cancelDelete();
  await seed(1,true);const other=await context.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(url);await other.getByRole('button',{name:'继续跟练',exact:true}).click();await other.getByRole('button',{name:'继续跟练',exact:true}).click({trial:true});const locked=await read();await openDelete();await approveDelete();await page.getByRole('alert').filter({hasText:'另一窗口正在跟练'}).waitFor();assert.deepEqual(await read(),locked);await cancelDelete();await other.close();
  results.push('确认后数据发生变化或另一窗口正在跟练时拒绝删除，保留最新数据');

  await page.reload();await openDelete();const before=await read();await approveDelete();await page.getByText('从一份自己的计划开始',{exact:true}).waitFor();
  const cleared=await read();assert.deepEqual(cleared,{schemaVersion:1,revision:before.revision+1,onboarded:false,activePlanId:null,plans:[],draft:null,workouts:[]});
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('training-follow-theme'),localStorage.getItem('training-follow-sound'),localStorage.getItem('other-app-sentinel')]),[null,null,'preserve']);
  await page.reload();await page.getByRole('dialog',{name:'创建计划',exact:true}).waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();
  await openSettings();await page.getByLabel('选择备份文件').setInputFiles({name:'effort16-backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});await page.getByRole('button',{name:'确认合并',exact:true}).click();await page.getByRole('button',{name:'确认合并',exact:true}).waitFor({state:'hidden'});
  const restored=await read();assert.equal(restored.plans.length,1);assert.equal(restored.workouts.length,1);assert.equal(restored.plans[0].items.at(-1).effort,16);assert.equal(restored.draft,null);await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  results.push('确认删除后训练数据与本应用偏好清空、版本递增；重新打开可创建计划，并可从16级备份恢复');
  assert.deepEqual(errors,[]);await fs.writeFile('test-results/data-safety-report.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}catch(error){await page.screenshot({path:'test-results/data-safety-failure.png'});throw error;}finally{await browser.close();}
