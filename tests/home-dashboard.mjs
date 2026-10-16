import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {exercises} from '../src/content/exercises.ts';
import {addDays,buildStages,createItem,dateLabel,monday,nextTraining,schedule,today,weekday} from '../src/domain/plans.ts';
import {newSession} from '../src/domain/session.ts';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1133,height:744},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'light'});
const page=await context.newPage(),errors=[],results=[],layouts=[];
page.on('pageerror',error=>errors.push(error.message));
const date=today(),stamp=new Date().toISOString();

async function seed(count=9,customize=()=>({})){
  const plan={id:'home-dashboard',name:'全身力量与有氧训练',type:'strength',weeks:6,days:[0,1,2,3,4,5,6],startDate:date,
    items:Array.from({length:count},(_,i)=>createItem(exercises[i%exercises.length])),createdAt:stamp,updatedAt:stamp,version:1};
  const state={schemaVersion:1,revision:1,onboarded:true,plans:[plan],activePlanId:plan.id,draft:null,workouts:[],...customize(plan)};
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('training-follow-db',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
  }),state);
  await page.reload();await page.getByRole('region',{name:'训练看板',exact:true}).waitFor();return state;
}
const read=()=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('training-follow-db',1);request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readonly'),q=tx.objectStore('state').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};
}));
function workout(plan,id,scheduledDate,elapsed,completed,finishedAt=stamp){return {id,planId:plan.id,planName:plan.name,scheduledDate,finishedAt,elapsed,completed,completedStages:completed?plan.items.length:1,totalStages:plan.items.length,confirmedReps:0};}

async function layout(label,fit=false){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const report=await page.evaluate(()=>{
    const issues=[],modules=[...document.querySelectorAll('main .module')];
    if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');
    for(const node of modules){const r=node.getBoundingClientRect();if(r.x<-1||r.right>innerWidth+1||r.y<-1||r.bottom>innerHeight+1||node.scrollWidth>node.clientWidth+1)issues.push('module outside viewport');}
    const grid=document.querySelector('.home-grid').getBoundingClientRect();
    if(innerWidth>820)for(const node of modules)if(Math.abs(node.getBoundingClientRect().height-grid.height)>1)issues.push('card changed height');
    const metrics=[...document.querySelectorAll('.plan-card-scroll,.calendar-body')].map(n=>({height:n.clientHeight,content:n.scrollHeight}));
    const cards=[...document.querySelectorAll('.home-movement')],routes=[...document.querySelectorAll('.home-movement-grid .flow-connections path[data-flow-from]')];
    if(routes.length!==cards.length-1)issues.push('missing flow routes');
    const boxes=cards.map(n=>n.getBoundingClientRect());
    const horizontal=boxes.length>1&&Math.abs(boxes[0].top-boxes[1].top)<1;
    for(let i=0;i<routes.length;i++){
      const path=routes[i],a=boxes[i],b=boxes[i+1],length=path.getTotalLength(),matrix=path.getScreenCTM();
      const point=t=>{const p=path.getPointAtLength(t);return new DOMPoint(p.x,p.y).matrixTransform(matrix);};
      const from=point(0),to=point(length),expectedFrom=horizontal?{x:a.right,y:a.top+a.height/2}:{x:a.left+a.width/2,y:a.bottom},expectedTo=horizontal?{x:b.left,y:b.top+b.height/2}:{x:b.left+b.width/2,y:b.top};
      if(Math.hypot(from.x-expectedFrom.x,from.y-expectedFrom.y)>1||Math.hypot(to.x-expectedTo.x,to.y-expectedTo.y)>1)issues.push('route endpoints '+i);
      if(horizontal){
        if(i%2===0&&(a.left>=b.left||Math.abs(a.top-b.top)>1))issues.push('row reading order '+i);
        if(i%2===1&&(a.left<=b.left||a.top>=b.top||path.dataset.flowKind!=='wrap'||!path.getAttribute('d').includes('Q')))issues.push('rounded row return '+i);
        if(point(1).x<from.x+.1||point(length-1).x>to.x-.1)issues.push('left entry and right exit '+i);
      }else if(path.dataset.flowKind!=='down'||Math.abs(a.left-b.left)>1)issues.push('vertical reading order '+i);
      for(let sample=1;sample<50;sample++){
        const p=point(length*sample/50);
        if(boxes.some(r=>p.x>r.left+1&&p.x<r.right-1&&p.y>r.top+1&&p.y<r.bottom-1))issues.push('route crosses a card '+i);
      }
    }
    return {issues,metrics,cardHeight:modules[0].getBoundingClientRect().height,actions:cards.length};
  });
  assert.deepEqual(report.issues,[],label);
  if(fit)for(const metric of report.metrics)assert.ok(metric.content<=metric.height+1,label+' internal overflow');
  layouts.push({label,...report});
  await page.screenshot({path:'test-results/dashboard-'+label+'.png'});
}

try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(process.env.APP_URL||'http://localhost:5190/');
  for(const count of [1,3,6,9,12]){await seed(count);await layout('1133x744-'+count,count<=6);}
  assert.ok(layouts.every(r=>Math.abs(r.cardHeight-layouts[0].cardHeight)<1));
  await page.setViewportSize({width:1133,height:650});await seed(9);await layout('1133x650-9',false);
  await page.setViewportSize({width:1133,height:744});await page.emulateMedia({colorScheme:'dark'});await seed(12);await layout('dark-12',false);
  await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:390,height:844});await seed(9);await layout('mobile-9');
  await page.setViewportSize({width:1133,height:744});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await layout('font200');
  await page.evaluate(()=>document.documentElement.style.fontSize='');await page.setViewportSize({width:1133,height:440});await layout('short-9');
  await page.setViewportSize({width:1133,height:744});await seed(30);await layout('long-30');
  await page.locator('.plan-card-scroll').evaluate(n=>n.scrollTop=n.scrollHeight);const last=await page.locator('.home-movement').last().boundingBox(),scroll=await page.locator('.plan-card-scroll').boundingBox();assert.ok(last.y>=scroll.y&&last.y+last.height<=scroll.y+scroll.height+1);
  results.push('11 场景固定卡片、逐行左右进出与圆角虚线连续、响应式/深色/放大与长列表滚动');

  const state=await seed(9,plan=>({workouts:[workout(plan,'completed',date,90,true),workout(plan,'partial',date,30,false)]}));
  assert.equal(await page.locator('.dashboard-week-count>strong').innerText(),'1/ '+schedule(state.plans[0]).filter(d=>d>=monday(date)&&d<=addDays(monday(date),6)).length+' 次');
  assert.equal((await page.locator('.dashboard-week-stats>div').nth(1).locator('strong').innerText()).replace(/\s/g,''),'2分钟');
  await page.getByRole('button',{name:'训练记录',exact:true}).click();assert.equal(await page.locator('[aria-label="最近三次跟练记录"]>li').count(),2);
  assert.equal(await page.getByText('已完成',{exact:true}).count(),1);assert.equal(await page.getByText('部分训练',{exact:true}).count(),1);
  assert.ok((await page.locator('[aria-label="最近三次跟练记录"]').innerText()).includes('实际跟练 30 秒'));
  await page.screenshot({path:'test-results/dashboard-records.png'});await page.getByRole('button',{name:'近期安排',exact:true}).click();
  const revision=(await read()).revision,hero=await page.locator('.next-date h3').innerText();
  await page.locator('.schedule-row').first().click();assert.equal(await page.locator('.follow-page').count(),0);assert.equal((await read()).revision,revision);assert.equal((await read()).draft,null);assert.equal(await page.locator('.next-date h3').innerText(),hero);
  await page.getByRole('button',{name:'进入跟练',exact:true}).click();await page.getByRole('button',{name:'开始跟练',exact:true}).waitFor();assert.equal((await read()).draft.scheduledDate,nextTraining(state.plans[0],state.workouts,date));
  results.push('实际用时包含部分训练，完成数不重复；查看记录和安排不改变自动训练日期');

  const draftState=await seed(3,plan=>({draft:{...newSession(plan,date,buildStages(plan,exercises)),elapsed:75}}));
  assert.ok((await page.locator('.dashboard-focus-detail').innerText()).includes('1.3 分钟'));
  assert.equal(await page.getByRole('button',{name:'编辑计划',exact:true}).isDisabled(),true);await layout('draft-3',true);
  await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.locator('.follow-page').waitFor();await page.getByRole('button',{name:'继续跟练',exact:true}).click({trial:true});assert.equal((await read()).draft.id,draftState.draft.id);
  results.push('草稿概览显示实际进度，继续跟练保留同一快照');

  await seed(1,plan=>{plan.weeks=1;plan.days=[weekday(date)];return {workouts:[workout(plan,'last',date,60,true)]};});
  assert.equal(await page.getByRole('button',{name:'本轮已完成',exact:true}).isDisabled(),true);await page.getByText('本轮训练已完成',{exact:true}).waitFor();await page.getByText('本轮安排已全部完成',{exact:true}).waitFor();await layout('completed-1',true);
  await seed(3);await page.getByRole('button',{name:'训练记录',exact:true}).click();await page.getByText('还没有跟练记录',{exact:true}).waitFor();await page.screenshot({path:'test-results/dashboard-empty-history.png'});
  results.push('计划完成禁用训练入口；无记录提供清楚的空状态');
  assert.deepEqual(errors,[]);await fs.writeFile('test-results/home-dashboard-report.json',JSON.stringify({results,layouts,errors},null,2));console.log(JSON.stringify({passed:results.length,layouts:layouts.length,results,errors},null,2));
}catch(error){await page.screenshot({path:'test-results/dashboard-failure.png'});throw error;}finally{await browser.close();}
