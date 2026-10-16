import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {exercises,findExercise} from '../src/content/exercises.ts';
import {buildStages,createItem,today,weekday} from '../src/domain/plans.ts';
import {newSession} from '../src/domain/session.ts';
import {validateState} from '../src/domain/validation.ts';

const baseline=process.argv.includes('--baseline'),url=process.env.APP_URL||'http://localhost:5190/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const errors=[],results=[],comparisons=[],output='test-results';
function fixture(){
  const stamp=new Date().toISOString(),date=today();
  const plan={id:'mobile-pages',name:'全身力量与恢复计划',type:'strength',weeks:4,days:[0,1,2,3,4,5,6],startDate:date,items:[
    {...createItem(findExercise('squat')),reps:8,sets:2,rest:30},
    {...createItem(findExercise('db-row')),reps:10,weight:12,sets:2,rest:30},
    {...createItem(findExercise('cycle')),seconds:300,effort:11},
    {...createItem(findExercise('foam-roll-calf')),seconds:30}
  ],createdAt:stamp,updatedAt:stamp,version:1};
  const other={...structuredClone(plan),id:'mobile-other',name:'代谢恢复计划',type:'aerobic',items:[createItem(findExercise('cycle'))]};
  const workouts=[{id:'mobile-history-1',planId:plan.id,planName:plan.name,scheduledDate:date,finishedAt:stamp,elapsed:400,completed:true,completedStages:8,totalStages:8,confirmedReps:36}];
  return validateState({schemaVersion:1,revision:1,onboarded:true,plans:[plan,other],activePlanId:plan.id,draft:null,workouts});
}
async function seed(page,change=state=>state){
  await page.goto(url);await page.getByRole('dialog',{name:'创建计划',exact:true}).waitFor();
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const r=indexedDB.open('training-follow-db',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{
      const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');
      tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);
    };
  }),validateState(change(fixture())));
  await page.reload();await page.locator('.training-dashboard').waitFor();
}
async function capture(page,name){
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const screenshot=await page.screenshot({animations:'disabled'});
  const geometry=await page.evaluate(()=>[...document.querySelectorAll('dialog[open] .module,.home-grid>.module,dialog[open],dialog[open] .settings-content>section,dialog[open] .saved-plan')].filter(node=>node.checkVisibility()).map(node=>{
    const r=node.getBoundingClientRect();return {className:node.className,x:r.x,y:r.y,width:r.width,height:r.height};
  }));
  if(baseline){await fs.writeFile(`${output}/${name}-before.png`,screenshot);await fs.writeFile(`${output}/${name}-before.json`,JSON.stringify(geometry));}
  else{
    await fs.writeFile(`${output}/${name}-after.png`,screenshot);
    const previous=await fs.readFile(`${output}/${name}-before.json`).then(JSON.parse).catch(()=>null);
    if(previous){assert.deepEqual(geometry,previous,name);comparisons.push({name,identicalPng:screenshot.equals(await fs.readFile(`${output}/${name}-before.png`))});}
  }
}

async function bounds(page,label){
  const issues=await page.evaluate(()=>{
    const issues=[],host=document.querySelector('dialog[open]:last-of-type')??document.querySelector('.app-shell');
    if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');
    for(const node of host.querySelectorAll('.module')){
      if(!node.checkVisibility())continue;const r=node.getBoundingClientRect();
      if(r.left<-.5||r.right>innerWidth+1||r.top<-.5||r.bottom>innerHeight+1||node.scrollWidth>node.clientWidth+1)issues.push('module overflow '+node.className);
    }
    if(!host.matches('dialog'))for(const selector of ['.dashboard-details','.home-timeline-scroll']){
      const node=host.querySelector(selector),minimum=selector==='.dashboard-details'?(node?.querySelector('h3')?.getBoundingClientRect().height??0)+22:32;
      if(node&&node.clientHeight<minimum)issues.push('missing home scroll area '+selector);
    }
    for(const node of host.querySelectorAll('button,input,select,a,label.secondary')){
      if(!node.checkVisibility())continue;const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;
      if(r.left<-.5||r.right>innerWidth+1)issues.push('control width '+(node.getAttribute('aria-label')||node.textContent));
      if(node.matches('button,label.secondary')&&(r.width<43.5||r.height<43.5))issues.push('small target '+(node.getAttribute('aria-label')||node.textContent)+' '+r.width+'×'+r.height);
    }
    const dialog=document.querySelector('dialog[open]:last-of-type');if(dialog){const r=dialog.getBoundingClientRect();if(r.left<0||r.top<-.5||r.right>innerWidth+1||r.bottom>innerHeight+1)issues.push('dialog bounds');}
    return issues;
  });
  if(issues.length)await page.screenshot({path:`${output}/mobile-pages-failure.png`});
  assert.deepEqual(issues,[],label);
}
async function range(page,name,value){
  await page.getByRole('slider',{name,exact:true}).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
}
const read=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('training-follow-db',1);request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('current');r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);
  };request.onerror=()=>reject(request.error);
}));

try{
  await fs.mkdir(output,{recursive:true});
  for(const [width,height] of [[1133,744],[1133,650],[744,1133]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await seed(page);
    await capture(page,`mobile-pages-ipad-${width}x${height}-home`);
    await page.getByRole('button',{name:'编辑计划',exact:true}).click();await page.getByRole('dialog',{name:'编辑计划',exact:true}).waitFor();
    await capture(page,`mobile-pages-ipad-${width}x${height}-editor`);await page.getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'打开设置'}).click();await capture(page,`mobile-pages-ipad-${width}x${height}-settings`);
    await page.getByRole('button',{name:'关闭设置'}).click();await page.getByRole('button',{name:'更换计划',exact:true}).click();
    await capture(page,`mobile-pages-ipad-${width}x${height}-chooser`);await context.close();
  }
  results.push(baseline?'Captured 12 iPad baselines for home, editor, settings and plan chooser':'iPad home, editor, settings and chooser keep original layout at three sizes');
  if(!baseline){
    const context=await browser.newContext({viewport:{width:420,height:912},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await seed(page);
    await bounds(page,'phone home');
    const dashboard=await page.locator('.training-dashboard').boundingBox(),plan=await page.locator('.current-plan').boundingBox();
    assert.ok(dashboard.y+dashboard.height<plan.y);assert.equal(await page.getByRole('group',{name:'看板内容'}).isVisible(),false);
    await page.screenshot({path:`output/phone-home.png`.replace('output',output)});
    await page.getByRole('heading',{name:'近期安排',exact:true}).waitFor();await page.getByRole('heading',{name:'训练记录',exact:true}).waitFor();
    assert.equal(await page.getByRole('list',{name:'接下来的训练安排'}).isVisible(),true);
    assert.equal(await page.getByRole('list',{name:'最近三次跟练记录'}).isVisible(),true);assert.equal((await read(page)).draft,null);
    assert.doesNotMatch(await page.getByRole('list',{name:'接下来的训练安排'}).innerText(),/训练日|星期/);
    const columns=await page.locator('.dashboard-column').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y};}));
    assert.ok(columns[0].right<columns[1].x);assert.ok(Math.abs(columns[0].y-columns[1].y)<1);
    assert.ok((await page.locator('.dashboard-focus').boundingBox()).height<=70,'compact next workout');
    assert.ok((await page.locator('.dashboard-week-stats').boundingBox()).height<=44,'compact weekly stats');
    await page.setViewportSize({width:420,height:740});await bounds(page,'compact home with two columns');
    const fixed=()=>page.evaluate(()=>Object.fromEntries(['.dashboard-focus','.dashboard-week-stats','.schedule-column .phone-column-title','.history-column .phone-column-title','.home-plan-identity','.home-metrics','.home-section-heading','.home-plan-footer','.home-session-footer'].map(selector=>{
      const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height}];
    })));
    const before=await fixed();await page.locator('.dashboard-details').hover();await page.mouse.wheel(0,500);
    await page.waitForFunction(()=>document.querySelector('.dashboard-details').scrollTop>0);
    await page.locator('.home-timeline-scroll').hover();await page.mouse.wheel(0,1000);
    await page.waitForFunction(()=>document.querySelector('.home-timeline-scroll').scrollTop>0);
    assert.deepEqual(await fixed(),before,'scrolling must preserve all fixed home information');
    assert.deepEqual(await page.locator('.dashboard-scroll,.home-plan-scroll').evaluateAll(nodes=>nodes.map(n=>n.scrollTop)),[0,0]);
    await page.locator('.home-timeline-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);
    const tail=await page.locator('.home-movement').last().boundingBox(),timeline=await page.locator('.home-timeline-scroll').boundingBox();
    assert.ok(tail.y>=timeline.y&&tail.y+tail.height<=timeline.y+timeline.height+1,'last timeline row stays reachable');
    assert.equal((await read(page)).draft,null);await page.screenshot({path:`${output}/phone-home-scrolled.png`});
    await page.setViewportSize({width:420,height:912});await page.locator('.dashboard-details,.home-timeline-scroll').evaluateAll(nodes=>nodes.forEach(n=>n.scrollTop=0));
    results.push('Phone dashboard keeps schedule/history in two visible columns with compact next/week information; wheel scrolling preserves the frozen header and only scrolls the plan timeline');

    await page.getByRole('button',{name:'编辑计划',exact:true}).click();await bounds(page,'phone editor');
    assert.equal(await page.getByLabel('动作库',{exact:true}).isVisible(),false);
    assert.ok((await page.getByLabel('计划区',{exact:true}).boundingBox()).width>370);
    await page.getByLabel('计划名称',{exact:true}).fill('手机端核心训练计划');await range(page,'调节计划周数',6);
    await page.getByRole('button',{name:'星期日',exact:true}).click();
    await page.getByRole('button',{name:'在第 2 位插入动作',exact:true}).click();
    assert.equal(await page.getByLabel('计划区',{exact:true}).isVisible(),false);await bounds(page,'phone library');
    await page.getByRole('button',{name:'训练类型热身',exact:true}).click();
    await page.getByLabel('筛选动作分组').selectOption('w-foam-roll');await page.screenshot({path:`${output}/phone-library.png`});
    await page.getByRole('button',{name:'添加泡沫轴滚小腿',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'编排计划',exact:true}).getAttribute('aria-pressed'),'true');
    await range(page,'调节泡沫轴滚小腿时长',45);
    await page.getByRole('button',{name:'添加动作',exact:true}).click();await page.getByRole('button',{name:'训练类型无氧训练',exact:true}).click();
    await page.getByRole('button',{name:'添加单臂哑铃划船',exact:true}).click();
    await range(page,'调节单臂哑铃划船重量',14);await range(page,'调节单臂哑铃划船次数',12);await range(page,'调节单臂哑铃划船组数',2);
    await page.getByRole('button',{name:'动作设置方式逐组设置',exact:true}).click();await page.getByRole('button',{name:'调节第1组次数',exact:true}).click();await range(page,'设置第1组次数',13);
    await page.getByRole('button',{name:'上移单臂哑铃划船',exact:true}).click();assert.equal(await page.locator('.plan-item.expanded').getAttribute('data-item-index'),'4');
    await page.getByRole('button',{name:'下移单臂哑铃划船',exact:true}).click();assert.equal(await page.locator('.plan-item.expanded').getAttribute('data-item-index'),'5');
    await bounds(page,'phone per-set editor');await page.screenshot({path:`${output}/phone-editor.png`});
    await page.getByRole('button',{name:'启用分日编排',exact:true}).click();await page.getByLabel('当前编辑的训练日').selectOption('5');
    await page.getByLabel('训练日方案名称').fill('周五力量');
    await page.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
    let state=await read(page),saved=state.plans.find(p=>p.id==='mobile-pages');
    assert.equal(saved.name,'手机端核心训练计划');assert.equal(saved.weeks,6);assert.equal(saved.dayPlans.length,6);
    assert.equal(saved.dayPlans.find(d=>d.day===5).name,'周五力量');assert.equal(saved.items.length,6);assert.equal(saved.items[1].exerciseId,'foam-roll-calf');assert.equal(saved.items[1].seconds,45);
    assert.equal(saved.items.at(-1).setTargets[0].reps,13);assert.equal(saved.items.at(-1).setTargets[0].weight,14);assert.equal(state.workouts.length,1);
    results.push('Full-width phone editor/library switching preserves insertion, warmup, rep/weight/per-set targets and independent training days');

    await page.getByRole('button',{name:'编辑计划',exact:true}).click();await page.getByRole('button',{name:'组合动作',exact:true}).click();
    await bounds(page,'phone group selection');await page.getByRole('checkbox',{name:'选择第3个动作单臂哑铃划船',exact:true}).check();
    await page.getByRole('checkbox',{name:'选择第4个动作健身车骑行',exact:true}).check();await page.getByRole('button',{name:'组成超级组',exact:true}).click();
    await range(page,'调节组合轮数',3);await bounds(page,'phone group settings');await page.screenshot({path:`${output}/phone-group.png`});
    await page.getByRole('button',{name:'拆分为独立动作',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();
    assert.equal((await read(page)).revision,state.revision);
    results.push('Phone group selection, round/rest controls and splitting remain readable; cancelling preserves the saved plan');

    await page.getByRole('button',{name:'更换计划',exact:true}).click();await bounds(page,'phone chooser');await page.screenshot({path:`${output}/phone-chooser.png`});
    await page.getByRole('button',{name:/代谢恢复计划/}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();assert.equal((await read(page)).activePlanId,'mobile-other');
    await page.getByRole('button',{name:'更换计划',exact:true}).click();await page.getByRole('button',{name:/手机端核心训练计划/}).click();
    await page.getByRole('button',{name:'打开设置'}).click();await bounds(page,'phone settings');
    assert.equal(await page.locator('.source-notes').isVisible(),false);
    await page.getByRole('button',{name:'动作说明与资料',exact:true}).click();assert.equal(await page.locator('.source-notes').isVisible(),true);
    await page.getByRole('button',{name:'收起动作说明与资料',exact:true}).click();
    await page.getByRole('button',{name:'主题深色',exact:true}).click();await page.screenshot({path:`${output}/phone-settings-dark.png`});
    const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();
    const backup=JSON.parse(await fs.readFile(await (await downloading).path(),'utf8'));
    await page.getByLabel('选择备份文件').setInputFiles({name:'手机备份验证.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.getByRole('heading',{name:'导入预览',exact:true}).waitFor();await bounds(page,'phone backup preview');await page.screenshot({path:`${output}/phone-backup.png`});
    await page.getByRole('button',{name:'确认合并',exact:true}).click();await page.getByRole('heading',{name:'导入预览',exact:true}).waitFor({state:'hidden'});
    await page.getByRole('button',{name:'删除所有数据',exact:true}).click();await bounds(page,'phone delete preview');
    assert.equal(await page.getByRole('button',{name:'确认删除全部数据',exact:true}).isDisabled(),true);
    await page.getByLabel('我了解删除后仅可通过已有备份恢复',{exact:true}).check();
    assert.equal(await page.getByRole('button',{name:'确认删除全部数据',exact:true}).isEnabled(),true);
    await page.screenshot({path:`${output}/phone-delete.png`});await page.getByRole('button',{name:'取消删除',exact:true}).click();
    assert.equal((await read(page)).plans.length,2);assert.equal((await read(page)).workouts.length,1);
    await page.getByRole('button',{name:'主题跟随系统',exact:true}).click();await page.getByRole('button',{name:'关闭设置'}).click();
    results.push('Phone plan switching, theme, expandable references, backup export/preview/merge and guarded deletion keep data intact');

    for(const [width,height] of [[420,740],[393,852],[390,664],[360,640]]){
      await page.setViewportSize({width,height});await bounds(page,`${width}×${height} home`);
      await page.getByRole('button',{name:'编辑计划',exact:true}).click();await bounds(page,`${width}×${height} editor`);
      await page.getByRole('button',{name:'添加动作',exact:true}).click();await bounds(page,`${width}×${height} library`);
      await page.getByRole('button',{name:'关闭编辑计划',exact:true}).click();
      await page.getByRole('button',{name:'打开设置'}).click();await bounds(page,`${width}×${height} settings`);await page.getByRole('button',{name:'关闭设置'}).click();
    }
    await page.setViewportSize({width:420,height:912});await page.emulateMedia({colorScheme:'dark'});
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await bounds(page,'200% home');await page.screenshot({path:`${output}/phone-home-large-text.png`});
    await page.getByRole('button',{name:'编辑计划',exact:true}).click();await bounds(page,'200% editor');
    await page.getByRole('button',{name:'添加动作',exact:true}).click();await bounds(page,'200% library');
    await page.getByRole('button',{name:'关闭编辑计划',exact:true}).click();
    await page.getByRole('button',{name:'打开设置'}).click();await bounds(page,'200% settings');
    await page.getByRole('button',{name:'关闭设置'}).click();await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
    await page.setViewportSize({width:912,height:420});assert.equal(await page.getByRole('group',{name:'看板内容'}).isVisible(),true);
    results.push('Home, editor, library and settings remain bounded at compressed/small phone sizes and dark 200% text; landscape retains the original controls');
    await context.close();
    for(const kind of ['draft','no-history','completed']){
      const stateContext=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
      const statePage=await stateContext.newPage();statePage.on('pageerror',e=>errors.push(e.message));
      await seed(statePage,state=>{
        const plan=state.plans[0];
        if(kind==='draft')state.draft={...newSession(plan,today(),buildStages(plan,exercises)),elapsed:75};
        if(kind==='no-history')state.workouts=[];
        if(kind==='completed'){plan.weeks=1;plan.days=[weekday(today())];}
        return state;
      });
      await bounds(statePage,kind+' phone home');
      if(kind==='draft'){assert.equal(await statePage.getByRole('button',{name:'继续跟练',exact:true}).isVisible(),true);assert.equal(await statePage.getByRole('button',{name:'丢弃未完成跟练',exact:true}).isVisible(),true);}
      if(kind==='no-history')await statePage.getByText('还没有跟练记录',{exact:true}).waitFor();
      if(kind==='completed')assert.equal(await statePage.getByRole('button',{name:'本轮已完成',exact:true}).isDisabled(),true);
      await statePage.screenshot({path:`${output}/phone-home-${kind}.png`});await stateContext.close();
    }
    results.push('Small phone draft/resume, no-history and completed-plan states preserve visible scroll areas and correct start-button availability');
    const emptyContext=await browser.newContext({viewport:{width:420,height:912},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
    const empty=await emptyContext.newPage();empty.on('pageerror',e=>errors.push(e.message));await empty.goto(url);
    await empty.getByRole('dialog',{name:'创建计划',exact:true}).waitFor();await bounds(empty,'first-run editor');
    await empty.getByRole('button',{name:'选择动作',exact:true}).click();await empty.getByRole('button',{name:'训练类型热身',exact:true}).click();
    await empty.getByRole('button',{name:'添加肩部绕环',exact:true}).click();assert.equal(await empty.locator('.plan-item.expanded').count(),1);
    await empty.getByRole('button',{name:'取消',exact:true}).click();await empty.getByRole('button',{name:'创建训练计划',exact:true}).waitFor();
    assert.equal(await empty.locator('.empty-calendar').isVisible(),false);assert.equal((await read(empty)).plans.length,0);
    await bounds(empty,'empty home');await empty.screenshot({path:`${output}/phone-empty.png`});await emptyContext.close();
    results.push('First-run phone setup, empty-plan action selection and cancellation return to a readable empty home without saving a plan');
  }
  assert.deepEqual(errors,[]);
  if(!baseline)await fs.writeFile(`${output}/mobile-pages-report.json`,JSON.stringify({results,comparisons,errors},null,2));
  console.log(JSON.stringify({baseline,results,comparisons,errors},null,2));
}finally{await browser.close();}
