import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {selectLibraryFor} from './library-helpers.mjs';
import {weekday,buildStages,estimateStages} from '../src/domain/plans.ts';
import {exercises} from '../src/content/exercises.ts';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),context=await browser.newContext({viewport:{width:1133,height:744},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}));
async function range(name,value){await page.getByRole('slider',{name,exact:true}).evaluate((e,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(value));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function openItem(name){await page.locator('.item-toggle').filter({has:page.locator('strong',{hasText:name})}).click();}
async function bounds(label){const issues=await page.evaluate(()=>{const issues=[];if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');for(const e of document.querySelectorAll('dialog[open] .module')){const b=e.getBoundingClientRect();if(b.left<-1||b.right>innerWidth+1||b.bottom>innerHeight+1||b.top<-1||e.scrollWidth>e.clientWidth+1)issues.push('module overflow');}return issues;});assert.deepEqual(issues,[],label);}
async function back(){await page.getByRole('button',{name:'保存进度并返回首页'}).click();await page.getByRole('button',{name:'继续跟练',exact:true}).waitFor();}
try{
 await fs.mkdir('test-results',{recursive:true});await page.goto(process.env.APP_URL||'http://localhost:5190/');
 await page.getByLabel('计划名称',{exact:true}).fill('分日与组合训练');
 await page.locator('[data-exercise=squat]').click();await range('调节徒手深蹲组数',2);
 await page.locator('[data-exercise=db-row]').click();await range('调节单臂哑铃划船组数',2);
 await selectLibraryFor(page,'march');await page.locator('[data-exercise=march]').click();await range('调节原地踏步时长',5);
 await page.getByRole('button',{name:'启用分日编排',exact:true}).click();
 await page.getByLabel('当前编辑的训练日').selectOption('5');await page.getByLabel('训练日方案名称').fill('力量循环');
 await openItem('徒手深蹲');await page.getByRole('button',{name:'动作设置方式逐组设置',exact:true}).click();
 await page.getByRole('button',{name:'调节第1组次数',exact:true}).click();await range('设置第1组次数',3);
 await page.getByRole('button',{name:'第1组类型',exact:true}).click();
 await page.getByRole('button',{name:'调节第2组次数',exact:true}).click();await range('设置第2组次数',5);
 await page.screenshot({path:'test-results/program-per-set.png'});
 await openItem('单臂哑铃划船');await page.getByRole('button',{name:'动作设置方式逐组设置',exact:true}).click();
 for(const [index,weight,reps] of [[1,4,2],[2,6,4]]){
  await page.getByRole('button',{name:'调节第'+index+'组重量',exact:true}).click();await range('设置第'+index+'组重量',weight);
  await page.getByRole('button',{name:'调节第'+index+'组次数',exact:true}).click();await range('设置第'+index+'组次数',reps);
 }
 await page.getByRole('button',{name:'组合动作',exact:true}).click();
 await page.getByRole('checkbox',{name:'选择第1个动作徒手深蹲',exact:true}).check();await page.getByRole('checkbox',{name:'选择第2个动作单臂哑铃划船',exact:true}).check();
 await page.getByRole('button',{name:'组成超级组',exact:true}).click();await range('调节轮间休息',5);
 await page.getByRole('button',{name:'完成组合',exact:true}).click();
 await openItem('徒手深蹲');assert.equal(await page.getByRole('slider',{name:'调节徒手深蹲组数'}).count(),0);
 await bounds('分日逐组编辑');await page.screenshot({path:'test-results/program-grouped-editor.png'});
 await page.setViewportSize({width:1133,height:650});await page.waitForFunction(()=>{const e=document.querySelector('.plan-item.expanded'),h=e.closest('[data-plan-scroll]').getBoundingClientRect(),r=e.getBoundingClientRect();return r.top>=h.top-1&&r.bottom<=h.bottom+1;});await bounds('压缩横屏');
 const visible=await page.locator('.plan-item.expanded').evaluate(e=>{const h=e.closest('[data-plan-scroll]').getBoundingClientRect(),r=e.getBoundingClientRect(),settings=e.querySelector('.item-setting-scroll');return {fullyVisible:r.top>=h.top-1&&r.bottom<=h.bottom+1,settingsScroll:settings.scrollHeight-settings.clientHeight};});
 assert.ok(visible.fullyVisible);assert.ok(visible.settingsScroll<=1);await page.screenshot({path:'test-results/program-editor-650.png'});await page.setViewportSize({width:1133,height:744});
 await page.getByLabel('当前编辑的训练日').selectOption('1');
 page.once('dialog',d=>d.accept());await page.getByLabel('复制其他训练日方案').selectOption('5');await page.getByLabel('训练日方案名称').fill('上肢训练');
 await page.getByLabel('当前编辑的训练日').selectOption('3');await page.getByLabel('训练日方案名称').fill('有氧恢复');
 for(const name of ['徒手深蹲','单臂哑铃划船','原地踏步'])await page.getByRole('button',{name:'删除'+name,exact:true}).click();
 await page.getByRole('button',{name:'训练类型代谢训练',exact:true}).click();await page.locator('[data-exercise=cycle]').click();await range('调节健身车骑行时长',5);await range('调节健身车骑行主观用力',16);
 await page.getByRole('button',{name:'完成设计',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
 let state=await read(),plan=state.plans[0];assert.equal(state.schemaVersion,2);assert.equal(plan.dayPlans.length,3);
 const mon=plan.dayPlans.find(d=>d.day===1),fri=plan.dayPlans.find(d=>d.day===5);assert.notEqual(mon.items[0].id,fri.items[0].id);assert.notEqual(mon.groups[0].id,fri.groups[0].id);assert.equal(mon.items[1].setTargets[1].weight,6);assert.equal(plan.dayPlans.find(d=>d.day===3).items[0].effort,16);
 await page.reload();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();await page.screenshot({path:'test-results/program-home.png'});
 results.push('分日方案独立编辑/命名，复制重建标识且保留逐组参数与组合，保存刷新后不丢失');
 await page.getByRole('button',{name:'进入跟练',exact:true}).click();await page.getByRole('button',{name:'开始跟练',exact:true}).waitFor();
 state=await read();const expected=buildStages(plan,exercises,state.draft.scheduledDate);assert.deepEqual(state.draft.stages,expected);assert.equal(state.draft.dayName,plan.dayPlans.find(d=>d.day===weekday(state.draft.scheduledDate)).name);
 assert.equal(expected.length,6);assert.deepEqual(expected.map(s=>s.name),['徒手深蹲','单臂哑铃划船','轮间休息','徒手深蹲','单臂哑铃划船','原地踏步']);
 assert.deepEqual(expected.filter(s=>s.name==='单臂哑铃划船').map(s=>s.weight),[4,6]);assert.equal(estimateStages(expected),52);
 await page.getByRole('button',{name:'开始跟练',exact:true}).click();await page.getByRole('button',{name:'完成 3 次 · 下一段',exact:true}).click();await page.getByRole('button',{name:'完成 2 次 · 下一段',exact:true}).click();
 await page.getByRole('button',{name:'暂停训练',exact:true}).click();await back();await page.reload();await page.getByRole('button',{name:'继续跟练',exact:true}).click();
 assert.equal(await page.locator('.current-movement h2').innerText(),'轮间休息');await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.getByRole('button',{name:'完成 5 次 · 下一段',exact:true}).waitFor({timeout:10000});
 await page.getByRole('button',{name:'暂停训练',exact:true}).click();await page.screenshot({path:'test-results/program-follow-round2.png'});
 assert.match(await page.locator('.next-value').innerText(),/6 kg/);
 await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.getByRole('button',{name:'完成 5 次 · 下一段',exact:true}).click();await page.getByRole('button',{name:'完成 4 次 · 下一段',exact:true}).click();
 await page.getByRole('button',{name:'查看本次训练',exact:true}).waitFor({timeout:10000});await page.getByRole('button',{name:'查看本次训练',exact:true}).click();await page.getByRole('button',{name:'保存并返回首页',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
 state=await read();assert.equal(state.workouts[0].completed,true);assert.equal(state.workouts[0].dayName,'力量循环');assert.equal(state.workouts[0].confirmedReps,14);
 results.push('按实际训练日期选择方案；超级组交替推进、逐组目标、轮间休息、暂停刷新恢复与完整记录正确');
 await page.getByRole('button',{name:'打开设置'}).click();const event=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();const download=await event,backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(backup.schemaVersion,2);assert.deepEqual(backup.state.plans,state.plans);
 await page.getByLabel('选择备份文件').setInputFiles({name:'program-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.getByRole('button',{name:'确认合并',exact:true}).click();await page.getByRole('button',{name:'确认合并',exact:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'关闭设置'}).click();assert.equal((await read()).plans.length,1);
 results.push('v2 备份保留训练日、每组参数、组合及记录，预览合并去重正常');
 await page.getByRole('button',{name:'编辑计划',exact:true}).click();await page.getByLabel('当前编辑的训练日').selectOption('5');
 await page.getByRole('button',{name:'编辑超级组',exact:true}).click();await page.getByRole('button',{name:'拆分为独立动作',exact:true}).click();await page.getByRole('button',{name:'组合动作',exact:true}).click();
 for(const [n,name] of [[1,'徒手深蹲'],[2,'单臂哑铃划船'],[3,'原地踏步']])await page.getByRole('checkbox',{name:'选择第'+n+'个动作'+name,exact:true}).check();
 await page.getByRole('button',{name:'组成循环组',exact:true}).click();await range('调节组合轮数',3);await range('调节轮间休息',5);await page.getByRole('button',{name:'完成组合',exact:true}).click();
 await page.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'编辑计划',exact:true}).waitFor();
 plan=(await read()).plans[0];const circuit=plan.dayPlans.find(d=>d.day===5);assert.equal(circuit.groups[0].kind,'circuit');assert.equal(circuit.items[0].setTargets.length,3);assert.equal(circuit.items[1].setTargets[2].weight,6);
 assert.deepEqual(buildStages(plan,exercises,'2026-10-16').map(s=>s.name),['徒手深蹲','单臂哑铃划船','原地踏步','轮间休息','徒手深蹲','单臂哑铃划船','原地踏步','轮间休息','徒手深蹲','单臂哑铃划船','原地踏步']);
 results.push('超级组可拆分并重编为循环组，轮数同步各动作，新增轮沿用末组参数');
 await page.getByRole('button',{name:'编辑计划',exact:true}).click();await page.getByLabel('当前编辑的训练日').selectOption('5');await openItem('单臂哑铃划船');
 for(const viewport of [{width:1133,height:650},{width:744,height:1133},{width:640,height:744},{width:390,height:844},{width:1133,height:520},{width:1133,height:744}]){await page.setViewportSize(viewport);await bounds('分日逐组响应式 '+viewport.width);}
 await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await bounds('深色大字号分日逐组');await page.screenshot({path:'test-results/program-dark-font200.png'});await page.evaluate(()=>document.documentElement.style.fontSize='');await page.emulateMedia({colorScheme:'light'});
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'合并为同一方案',exact:true}).click();assert.equal(await page.getByLabel('当前编辑的训练日').count(),1);
 for(const name of ['星期一','星期三','星期五'])await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.getByRole('button',{name:'保存修改',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'星期五',exact:true}).click();assert.equal(await page.getByLabel('当前编辑的训练日').inputValue(),'5');await page.getByRole('button',{name:'取消',exact:true}).click();
 results.push('分日逐组界面适配压缩横屏、竖屏、分屏、手机、短窗口及深色200%字号；取消合并保留全部方案');
 assert.deepEqual(errors,[]);await fs.writeFile('test-results/program-browser-report.json',JSON.stringify({results,errors,compactLayout:visible},null,2));console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}catch(error){await page.screenshot({path:'test-results/program-failure.png'});console.log(await page.locator('.plan-item.expanded').evaluate(e=>{const host=e.closest('[data-plan-scroll]'),s=e.querySelector('.item-setting-scroll');return {card:e.getBoundingClientRect().toJSON(),host:host.getBoundingClientRect().toJSON(),settings:{height:s.clientHeight,scrollHeight:s.scrollHeight,max:getComputedStyle(s).maxHeight}};}).catch(()=>null));throw error;}finally{await browser.close();}
