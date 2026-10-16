import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {exercises} from '../src/content/exercises.ts';
import {buildStages,createItem,today} from '../src/domain/plans.ts';
import {newSession} from '../src/domain/session.ts';

const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1133,height:744},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'light'}),page=await context.newPage(),errors=[],results=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
const stamp=new Date().toISOString(),date=today();
async function seed(count=12,index=0,timed=false){
  const squat=exercises.find(e=>e.id==='squat'),march=exercises.find(e=>e.id==='march');
  const items=Array.from({length:count},()=>({...createItem(squat),mode:'reps',reps:8,sets:1}));
  if(timed)items.splice(0,items.length,{...createItem(march),seconds:5,sets:1},{...createItem(squat),mode:'reps',reps:8,sets:2,rest:5});
  const plan={id:'timeline-flow',name:'跟练动作路径验收',type:'strength',weeks:4,days:[0,1,2,3,4,5,6],startDate:date,items,createdAt:stamp,updatedAt:stamp,version:1};
  const stages=buildStages(plan,exercises),draft={...newSession(plan,date,stages),index,elapsed:index*6,completed:stages.slice(0,index).map(s=>s.id)};
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const r=indexedDB.open('training-follow-db',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
  }),{schemaVersion:1,revision:1,onboarded:true,plans:[plan],activePlanId:plan.id,draft,workouts:[]});
  await page.reload();await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.locator('.follow-page').waitFor();return draft;
}
async function centered(label,index){
  await page.waitForFunction(index=>{
    const host=document.querySelector('.follow-timeline'),rows=[...document.querySelectorAll('.follow-step')],row=rows[index];
    if(!host||!row||!host.clientHeight)return false;
    const a=host.getBoundingClientRect(),b=row.getBoundingClientRect();
    const paths=[...host.querySelectorAll('.flow-connections path[data-flow-from]')];
    const routesReady=paths.length===rows.length-1&&paths.every((path,i)=>{
      const r=rows[i].getBoundingClientRect(),s=rows[i+1].getBoundingClientRect(),p=path.getPointAtLength(0),q=path.getPointAtLength(path.getTotalLength()),m=path.getScreenCTM();
      const from=new DOMPoint(p.x,p.y).matrixTransform(m),to=new DOMPoint(q.x,q.y).matrixTransform(m);
      return Math.hypot(from.x-r.left-r.width/2,from.y-r.bottom)<1&&Math.hypot(to.x-s.left-s.width/2,to.y-s.top)<1;
    });
    return routesReady&&Math.abs(b.top+b.height/2-a.top-host.clientTop-host.clientHeight/2)<1&&row.getAttribute('aria-current')==='step';
  },index,{timeout:5000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const report=await page.evaluate(()=>{
    const host=document.querySelector('.follow-timeline'),rows=[...host.querySelectorAll('.follow-step')],paths=[...host.querySelectorAll('.flow-connections path[data-flow-from]')],current=host.querySelector('[aria-current=step]'),issues=[];
    const a=host.getBoundingClientRect(),b=current.getBoundingClientRect(),centerError=b.top+b.height/2-a.top-host.clientTop-host.clientHeight/2;
    if(paths.length!==rows.length-1)issues.push('missing vertical connectors');
    if(rows.filter(n=>n.classList.contains('current')).length!==1)issues.push('current highlight');
    if(getComputedStyle(current).backgroundColor===getComputedStyle(rows.find(n=>n!==current)??current).backgroundColor&&rows.length>1)issues.push('highlight not visible');
    for(let i=0;i<paths.length;i++){
      const path=paths[i],first=rows[i].getBoundingClientRect(),next=rows[i+1].getBoundingClientRect(),length=path.getTotalLength(),matrix=path.getScreenCTM();
      const point=t=>{const p=path.getPointAtLength(t);return new DOMPoint(p.x,p.y).matrixTransform(matrix);},start=point(0),end=point(length);
      if(path.dataset.flowKind!=='down'||Math.abs(start.x-(first.left+first.width/2))>1||Math.abs(start.y-first.bottom)>1||Math.abs(end.x-(next.left+next.width/2))>1||Math.abs(end.y-next.top)>1)issues.push('vertical path geometry '+i);
    }
    if(document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1)issues.push('document overflow');
    for(const node of document.querySelectorAll('.module')){const r=node.getBoundingClientRect();if(r.left<-1||r.right>innerWidth+1||r.top<-1||r.bottom>innerHeight+1||node.scrollWidth>node.clientWidth+1)issues.push('module bounds');}
    return {centerError,scrollTop:host.scrollTop,viewportHeight:host.clientHeight,cardHeight:b.height,rows:rows.length,issues};
  });
  assert.deepEqual(report.issues,[],label);checks.push({label,...report});
}
async function returnHome(){await page.getByRole('button',{name:'保存进度并返回首页'}).click();await page.getByRole('button',{name:'继续跟练',exact:true}).waitFor();}

try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(process.env.APP_URL||'http://localhost:5190/');
  await seed();await centered('first',0);await page.screenshot({path:'test-results/timeline-first.png'});
  await page.getByRole('button',{name:'开始跟练',exact:true}).click();
  for(let index=1;index<12;index++){
    await page.getByRole('button',{name:'完成 8 次 · 下一段',exact:true}).click();await centered('advance-'+index,index);
    if(index===5){
      await page.getByRole('button',{name:'暂停训练',exact:true}).click();await page.screenshot({path:'test-results/timeline-middle.png'});
      await page.setViewportSize({width:1133,height:650});await centered('compressed',index);
      await page.setViewportSize({width:744,height:1133});await centered('portrait',index);
      await page.setViewportSize({width:1133,height:744});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await centered('font200',index);
      await page.evaluate(()=>document.documentElement.style.fontSize='');await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await centered('dark-reduced-motion',index);await page.screenshot({path:'test-results/timeline-middle-dark.png'});
      await page.emulateMedia({colorScheme:'light'});await page.getByRole('button',{name:'继续跟练',exact:true}).click();
    }
  }
  await page.getByRole('button',{name:'暂停训练',exact:true}).click();await centered('last-paused',11);await page.screenshot({path:'test-results/timeline-last.png'});
  await returnHome();await page.reload();await page.getByRole('button',{name:'继续跟练',exact:true}).click();await centered('restored-last',11);
  results.push('首项到末项真实计次推进均高亮并居中，暂停/刷新恢复保持当前段');
  results.push('压缩横屏、竖屏、200% 字号与深色/reduced motion 变化后重新居中，虚线连续且模块不溢出');

  await returnHome();await seed(1);await centered('single',0);assert.equal(await page.locator('.follow-timeline .flow-connections path[data-flow-from]').count(),0);await returnHome();
  results.push('单动作亦居中，无多余虚线');
  await seed(2,0,true);await centered('timed-first',0);await page.getByRole('button',{name:'开始跟练',exact:true}).click();
  await page.getByRole('button',{name:'完成 8 次 · 下一段',exact:true}).waitFor({timeout:8000});await centered('timed-to-reps',1);
  await page.getByRole('button',{name:'完成 8 次 · 下一段',exact:true}).click();await centered('set-rest',2);
  await page.getByRole('button',{name:'完成 8 次 · 下一段',exact:true}).waitFor({timeout:8000});await centered('rest-to-reps',3);
  await page.getByRole('button',{name:'暂停训练',exact:true}).click();await returnHome();
  results.push('计时自动切换、组间休息、下一组计次均自动居中，保存原规则不变');
  assert.deepEqual(errors,[]);await fs.writeFile('test-results/timeline-flow-report.json',JSON.stringify({results,checks,errors},null,2));console.log(JSON.stringify({passed:results.length,centerChecks:checks.length,maxCenterError:Math.max(...checks.map(c=>Math.abs(c.centerError))),results,errors},null,2));
 }catch(error){console.log(JSON.stringify(await page.evaluate(()=>{const host=document.querySelector('.follow-timeline'),list=host?.querySelector('.training-sequence'),svg=list?.querySelector('.flow-connections'),rows=[...host?.querySelectorAll('.follow-step')??[]];return {host:{height:host?.clientHeight,top:host?.scrollTop,display:host&&getComputedStyle(host).display},list:{height:list?.getBoundingClientRect().height,padding:list&&getComputedStyle(list).paddingTop},svg:svg?.outerHTML.slice(0,800),points:[...host?.querySelectorAll('path[data-flow-kind]')??[]].slice(0,2).map((path,i)=>{const p=path.getPointAtLength(0),pt=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM()),b=rows[i].getBoundingClientRect();return {x:pt.x,y:pt.y,expected:{x:b.x+b.width/2,y:b.bottom},svgBounds:svg.getBoundingClientRect().toJSON()};})};}),null,2));await page.screenshot({path:'test-results/timeline-failure.png'});throw error;}finally{await browser.close();}
