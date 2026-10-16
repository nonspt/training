import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {findExercise} from '../src/content/exercises.ts';
import {libraryGroups} from '../src/content/library-layouts.ts';
const url=process.env.APP_URL||'http://localhost:5190/',browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),context=await browser.newContext({viewport:{width:1133,height:744},screen:{width:1133,height:744},deviceScaleFactor:2,hasTouch:true,isMobile:true}),page=await context.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const editor=()=>page.locator('dialog.wide[open]'),body=()=>page.getByLabel('筛选训练部位'),group=()=>page.getByLabel('筛选动作分组');
const currentIds=()=>page.locator('[data-exercise]').evaluateAll(nodes=>nodes.map(n=>n.dataset.exercise));
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('training-follow-db',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}));
async function layout(label){const issues=await page.evaluate(()=>{const host=document.querySelector('dialog.wide[open]')||document.querySelector('[data-session-page]'),issues=[];if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');for(const node of host.querySelectorAll('.module')){const r=node.getBoundingClientRect();if(r.x<-.5||r.right>innerWidth+1||r.y<-.5||r.bottom>innerHeight+1)issues.push('module outside '+node.className);if(node.scrollWidth>node.clientWidth+1)issues.push('module horizontal overflow '+node.className);}for(const node of host.querySelectorAll('button,input,select,a')){const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;const scroller=node.closest('.internal-scroll,.library-controls,.item-setting-scroll,.modal-body');if(scroller){const box=scroller.getBoundingClientRect();if(r.bottom<box.top||r.top>box.bottom)continue;}const minimum=host.matches('dialog.wide')?23.5:43.5;if(r.width<minimum||r.height<minimum)issues.push('small target '+(node.getAttribute('aria-label')||node.textContent));if(r.x<-.5||r.right>innerWidth+1)issues.push('outside width '+node.tagName);}return issues;});assert.deepEqual(issues,[],label);}
async function range(name,value){const slider=page.getByRole('slider',{name,exact:true});await slider.evaluate((input,target)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(target));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);assert.equal(Number(await slider.inputValue()),value);}
async function centered(){await page.waitForFunction(()=>{const host=document.querySelector('[data-plan-scroll]'),item=host?.querySelector('.expanded');if(!item)return false;const a=host.getBoundingClientRect(),b=item.getBoundingClientRect();return Math.abs(a.top+a.height/2-b.top-b.height/2)<25;});}
try{
  await fs.mkdir('test-results',{recursive:true});
  await page.goto(url);await editor().waitFor();
  for(const [type,label] of [['warmup','热身'],['aerobic','代谢训练'],['strength','无氧训练']]){
    await page.getByRole('button',{name:'训练类型'+label,exact:true}).click();
    assert.deepEqual(await currentIds(),libraryGroups[type].flatMap(g=>g.exerciseIds));
    assert.deepEqual(await group().locator('option').allTextContents(),['全部分组',...libraryGroups[type].map(g=>g.name)]);
    assert.equal(await page.locator('[data-library-group]').count(),4);
    await layout(label);await page.locator('.library-scroll').evaluate(n=>n.scrollTop=0);
    await page.screenshot({path:`test-results/library-${type}-light.png`});
  }
  results.push('热身、代谢训练、无氧训练三个入口，各自四类，全部动作与分组筛选可见');
  for(const part of ['chest','back','shoulders','arms','legs','glutes','core']){
    await body().selectOption(part);const ids=await currentIds();assert.ok(ids.length>=4);
    assert.ok(ids.every(id=>findExercise(id).bodyParts.includes(part)),part);await layout(part+'部位筛选');
  }
  await body().selectOption('all');await group().selectOption('s-upper-push');
  assert.ok((await currentIds()).includes('barbell-bench'));
  assert.ok(!(await currentIds()).includes('barbell-deadlift'));
  await page.getByRole('button',{name:'训练类型热身',exact:true}).click();
  assert.equal(await group().inputValue(),'all');assert.equal(await body().inputValue(),'all');
  await group().selectOption('w-foam-roll');assert.equal((await currentIds()).length,6);
  await page.getByRole('button',{name:'徒手',exact:true}).click();
  await page.getByRole('heading',{name:'没有匹配的动作',exact:true}).waitFor();
  await page.getByRole('button',{name:'显示全部动作',exact:true}).click();
  assert.deepEqual(await currentIds(),libraryGroups.warmup.flatMap(g=>g.exerciseIds));
  results.push('部位与新分组取交集，泡沫轴器械筛选、空结果重置、切库重置筛选');
  await page.getByRole('button',{name:'训练类型无氧训练',exact:true}).click();
  for(const [id,weight] of [['barbell-squat',120],['barbell-bench',80],['barbell-deadlift',140]]){
    const exercise=findExercise(id);await page.getByRole('button',{name:'添加'+exercise.name,exact:true}).click();
    await centered();await range('调节'+exercise.name+'重量',weight);
  }
  await layout('三大项按推拉分类仍可组合');await page.screenshot({path:'test-results/library-big-three.png'});
  const before=await page.locator('.item-toggle strong').allTextContents();
  await page.getByRole('button',{name:'训练类型代谢训练',exact:true}).click();
  assert.deepEqual(await page.locator('.item-toggle strong').allTextContents(),before);
  assert.equal(await page.locator('[data-exercise="barbell-bench"]').count(),0);
  assert.equal(await page.locator('[data-exercise="burpee"]').count(),1);
  await group().selectOption('a-lsd');
  for(const [width,height] of [[1133,650],[744,1133],[567,744],[390,844],[1133,440]]){
    await page.setViewportSize({width,height});await layout(`${width}×${height} LSD长标题`);
  }
  await page.setViewportSize({width:1133,height:744});
  await page.getByRole('button',{name:'训练类型无氧训练',exact:true}).click();
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await body().selectOption('chest');await layout('深色胸部筛选');
  await page.screenshot({path:'test-results/library-strength-dark.png'});
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');await layout('200% 编辑器');
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  results.push('三大项保留120/80/140kg，跨库编排不丢动作；横竖屏、手机、短窗口、深色及200%字号');
  await page.getByRole('button',{name:'训练类型代谢训练',exact:true}).click();
  await page.getByRole('button',{name:'训练类型热身',exact:true}).click();
  await page.getByRole('button',{name:'添加泡沫轴滚小腿',exact:true}).click();await range('调节泡沫轴滚小腿时长',45);
  await page.getByRole('button',{name:'添加胸椎旋转活动',exact:true}).click();await range('调节胸椎旋转活动次数',12);
  await page.getByRole('button',{name:'完成设计',exact:true}).click();
  await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();let state=await read();
  assert.equal(state.plans[0].type,'aerobic');
  assert.deepEqual(state.plans[0].items.map(i=>i.weight),[120,80,140,0,0]);
  assert.equal(state.plans[0].items[3].seconds,45);assert.equal(state.plans[0].items[4].reps,12);
  await page.reload();await page.getByText('代谢训练',{exact:true}).waitFor();
  await page.getByRole('button',{name:'进入跟练',exact:true}).click();
  await page.getByRole('button',{name:'开始跟练',exact:true}).waitFor();
  assert.equal(await page.locator('.target-reading strong').innerText(),'120');await layout('跨库计划跟练');
  await page.getByRole('button',{name:'保存进度并返回首页'}).click();
  await page.getByRole('button',{name:'继续跟练',exact:true}).waitFor();state=await read();
  assert.equal(state.draft.stages[0].weight,120);
  assert.equal(state.draft.stages.find(s=>s.name==='泡沫轴滚小腿').seconds,45);
  assert.equal(state.draft.stages.find(s=>s.name==='胸椎旋转活动').reps,12);
  results.push('停留热身入口保存不改变代谢计划类型，新计时/计次动作可持久化并进入跟练快照');
  assert.deepEqual(errors,[]);
  await fs.writeFile('test-results/library-browser-report.json',JSON.stringify({results,pageErrors:errors},null,2));
  console.log(JSON.stringify({passed:results.length,results},null,2));
}catch(error){await page.screenshot({path:'test-results/library-failure.png'});throw error;}finally{await browser.close();}
