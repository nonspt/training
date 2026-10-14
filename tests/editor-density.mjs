import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {findExercise} from '../src/content/exercises.ts';
import {createItem} from '../src/domain/plans.ts';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1133,height:744},screen:{width:1133,height:744},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const page=await context.newPage(),errors=[],results=[],measurements=[];
page.on('pageerror',e=>errors.push(e.message));
const url=process.env.APP_URL||'http://localhost:5190/';
async function range(name,value){await page.getByRole('slider',{name,exact:true}).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function inspect(name){
  await page.waitForFunction(()=>{const item=document.querySelector('.plan-item.expanded'),host=document.querySelector('[data-plan-scroll]');if(!item)return false;const a=item.getBoundingClientRect(),b=host.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1;});
  const report=await page.evaluate(()=>{
    const host=document.querySelector('[data-plan-scroll]'),item=host.querySelector('.expanded'),h=host.getBoundingClientRect(),r=item.getBoundingClientRect(),index=Number(item.dataset.itemIndex),previous=host.querySelector('[data-item-index="'+(index-1)+'"]'),p=previous?.getBoundingClientRect(),settings=item.querySelector('.item-setting-scroll'),issues=[];
    if(Math.abs(document.querySelector('.library-module').getBoundingClientRect().width-document.querySelector('.plan-module').getBoundingClientRect().width)>1)issues.push('unequal modules');
    for(const control of item.querySelectorAll('button,input,summary')){const c=control.getBoundingClientRect();if(c.top<h.top-1||c.bottom>h.bottom+1||c.x<r.x||c.right>r.right+1)issues.push(control.getAttribute('aria-label')||control.textContent);}
    if(settings.scrollHeight>settings.clientHeight+1)issues.push('settings require scrolling');
    if(previous&&(p.top<h.top-1||p.bottom>h.bottom+1))issues.push('previous item not fully visible');
    return {issues,scrollHeight:h.height,cardHeight:r.height,previousHeight:p?.height};
  });
  assert.deepEqual(report.issues,[],name);measurements.push({name,...report});
}
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('training-follow-db',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}));
try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(url);await page.locator('dialog.wide[open]').waitFor();
  assert.equal(await page.getByRole('group',{name:'训练类型',exact:true}).getByRole('button').count(),2);
  assert.equal(await page.getByRole('button',{name:'训练类型综合训练',exact:true}).count(),0);
  assert.equal(await page.locator('.plan-meta-hint,.plan-module .editor-status,.weight-note').count(),0);
  const density=await page.evaluate(()=>{const library=document.querySelector('.library-scroll'),box=library.getBoundingClientRect(),visible=[...library.querySelectorAll('[data-exercise]')].filter(n=>{const r=n.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom;}).length,plan=document.querySelector('.plan-module').getBoundingClientRect(),scroll=document.querySelector('[data-plan-scroll]').getBoundingClientRect(),weeks=document.querySelector('.plan-schedule-row .range-field').getBoundingClientRect(),days=document.querySelector('.weekday-field').getBoundingClientRect();return {visible,planHeight:plan.height,scrollHeight:scroll.height,sameRow:Math.abs(weeks.y-days.y)<1,footerHeight:document.querySelector('.editor-actions').getBoundingClientRect().height};});
  assert.ok(density.visible>=25,JSON.stringify(density));assert.ok(density.scrollHeight/density.planHeight>.7);assert.ok(density.footerHeight<=48);assert.ok(density.sameRow);measurements.push({name:'1133×744 工作区',...density});
  await page.screenshot({path:'test-results/editor-density-empty.png'});results.push('仅两类库，首屏至少25个动作，动作设置区超过计划模块70%，周数与训练日同行，底栏不超过48px');
  await page.getByRole('button',{name:'添加原地踏步',exact:true}).click();await page.getByRole('button',{name:'完成此动作',exact:true}).click();
  const scenarios=[['strength','barbell-deadlift'],['strength','db-row'],['strength','squat-press'],['strength','farmer-carry'],['strength','plank-walkup'],['strength','single-leg-balance'],['aerobic','rower-interval'],['aerobic','burpee'],['aerobic','battle-rope'],['aerobic','skater-step'],['aerobic','easy-cycle'],['aerobic','hamstring-stretch']];
  for(const height of [744,650]){
    await page.setViewportSize({width:1133,height});
    for(const [type,id] of scenarios){
      const exercise=findExercise(id);await page.getByRole('button',{name:'训练类型'+(type==='strength'?'无氧训练':'有氧训练'),exact:true}).click();await page.locator('[data-exercise="'+id+'"]').click();
      const sets=page.getByRole('slider',{name:'调节'+exercise.name+'组数',exact:true});if(await sets.count())await range('调节'+exercise.name+'组数',3);
      await inspect(height+'px '+exercise.name);
      if(exercise.countable){await page.getByRole('button',{name:exercise.name+'计量按时长',exact:true}).click();await inspect(height+'px '+exercise.name+'按时长');await page.getByRole('button',{name:exercise.name+'计量按次数',exact:true}).click();}
      assert.equal(await page.locator('.quick-values').count(),0);assert.equal(await page.getByRole('group',{name:'快捷目标',exact:true}).count(),0);assert.equal(await page.getByRole('group',{name:'快捷重量',exact:true}).count(),0);
      if(id==='barbell-deadlift')await page.screenshot({path:'test-results/editor-density-'+height+'.png'});
      await page.getByRole('button',{name:'删除'+exercise.name,exact:true}).click();
    }
  }
  results.push('744px与650px横屏，力量、器械、复合、功能、核心、体能、间歇、热身和恢复：全部设置无需滚动且完整显示上一动作；无滑块快选按钮');
  await page.setViewportSize({width:1133,height:744});await page.getByRole('button',{name:'训练类型无氧训练',exact:true}).click();await page.locator('[data-exercise="barbell-deadlift"]').click();
  await range('调节杠铃硬拉次数',14);await page.getByRole('button',{name:'杠铃硬拉计量按时长',exact:true}).click();await range('调节杠铃硬拉时长',90);await page.getByRole('button',{name:'杠铃硬拉计量按次数',exact:true}).click();assert.equal(await page.getByRole('slider',{name:'调节杠铃硬拉次数'}).inputValue(),'14');
  await range('调节杠铃硬拉重量',120);await range('调节杠铃硬拉组数',1);assert.equal(await page.getByRole('slider',{name:'调节杠铃硬拉组间休息',exact:true}).count(),0);await range('调节杠铃硬拉组数',3);await inspect('计量切换与休息显隐');
  await page.locator('.movement-details summary').click();await page.locator('.movement-source').waitFor({state:'visible'});await inspect('展开动作要点后仍保留全部控件与上一动作');
  await page.getByRole('button',{name:'完成设计',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();let state=await read();assert.equal(state.plans[0].items[1].reps,14);assert.equal(state.plans[0].items[1].seconds,90);assert.equal(state.plans[0].items[1].weight,120);results.push('计次/计时保留各自值，组间休息显隐，说明折叠与参数持久保存');
  // Existing mixed plans stay mixed when opened/saved without a type change.
  const now=new Date().toISOString(),legacy={id:'legacy-mixed',name:'原综合计划',type:'mixed',weeks:4,days:[1,3,5],startDate:'2026-10-14',items:['burpee','farmer-carry','plank-walkup','band'].map(id=>createItem(findExercise(id))),createdAt:now,updatedAt:now,version:1};
  await page.evaluate(plan=>new Promise((resolve,reject)=>{const q=indexedDB.open('training-follow-db',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('current');r.onsuccess=()=>store.put({...r.result,plans:[plan],activePlanId:plan.id,revision:r.result.revision+1},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),legacy);
  await page.reload();await page.getByRole('button',{name:'编辑计划',exact:true}).click();assert.equal(await page.getByRole('button',{name:'训练类型无氧训练',exact:true}).getAttribute('aria-pressed'),'true');assert.deepEqual(await page.locator('.item-toggle strong').allTextContents(),legacy.items.map(i=>findExercise(i.exerciseId).name));await page.getByRole('button',{name:'保存修改',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();state=await read();assert.equal(state.plans[0].type,'mixed');assert.deepEqual(state.plans[0].items,legacy.items);results.push('旧综合计划进入编辑默认显示无氧库，保存保持原分类、动作顺序及全部参数');
  assert.deepEqual(errors,[]);await fs.writeFile('test-results/editor-density-report.json',JSON.stringify({results,measurements,pageErrors:errors},null,2));console.log(JSON.stringify({passed:results.length,results,workspace:density},null,2));
}catch(error){await page.screenshot({path:'test-results/editor-density-failure.png'});throw error;}finally{await browser.close();}
