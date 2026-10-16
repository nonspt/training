import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {exercises,findExercise} from '../src/content/exercises.ts';
import {buildStages,createItem,today} from '../src/domain/plans.ts';
import {newSession} from '../src/domain/session.ts';
import {validateState} from '../src/domain/validation.ts';

const baseline=process.argv.includes('--baseline'),url=process.env.APP_URL||'http://localhost:5190/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const output='test-results',errors=[],results=[],comparisons=[];
const tabletViews=[[1133,744],[1133,650],[744,1133],[820,1180]];
const watch=page=>page.on('pageerror',error=>errors.push(error.message));

async function seed(page,index=0,{longName=false,count=6,weightedTime=false}={}){
  await page.goto(url);await page.getByRole('dialog',{name:'创建计划',exact:true}).waitFor();
  const stamp=new Date().toISOString(),date=today();
  const items=[
    {...createItem(findExercise('cycle')),seconds:10,effort:13},
    {...createItem(findExercise('db-row')),reps:6,weight:12,effort:9},
    {...createItem(findExercise('plank')),seconds:10,effort:5},
    {...createItem(findExercise('cycle')),seconds:5,effort:7},
    {...createItem(findExercise('standing-rest')),seconds:5},
    {...createItem(findExercise('squat')),reps:8}
  ];
  items.splice(count);
  if(weightedTime)items[0]={...createItem(findExercise('farmer-carry')),seconds:30,weight:20};
  const plan={id:'phone-follow',name:'手机跟练布局验收',type:'mixed',weeks:4,days:[0,1,2,3,4,5,6],startDate:date,items,createdAt:stamp,updatedAt:stamp,version:1};
  const stages=buildStages(plan,exercises);
  if(longName)stages[1].name='单臂哑铃划船：左右交替保持躯干稳定与肩胛控制的长动作名称显示检查';
  const draft={...newSession(plan,date,stages),index,completed:stages.slice(0,index).map(stage=>stage.id)};
  const state=validateState({schemaVersion:1,revision:1,onboarded:true,plans:[plan],activePlanId:plan.id,draft,workouts:[]});
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('training-follow-db',1);
    request.onerror=()=>reject(request.error);request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');
      tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);
    };
  }),state);
  await page.reload();try{await page.getByRole('button',{name:'继续跟练',exact:true}).click({timeout:5000});}catch(error){console.log(await page.locator('body').innerText());await page.screenshot({path:'test-results/follow-phone-failure.png'});throw error;}
  await page.getByRole('button',{name:index?'继续跟练':'开始跟练',exact:true}).waitFor();
  await page.waitForFunction(()=>{const button=document.querySelector('.follow-controls .primary');return !!button&&!button.disabled;});
  await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function phoneBounds(page,label){
  await page.waitForFunction(()=>{
    const host=document.querySelector('.follow-timeline'),row=host?.querySelector('[aria-current=step]')??host?.querySelector('.follow-step:last-of-type');
    if(!row||!host.clientHeight)return false;
    const a=host.getBoundingClientRect(),b=row.getBoundingClientRect();const visible=Math.min(b.bottom,a.bottom)-Math.max(b.top,a.top);return visible>=Math.min(b.height,host.clientHeight)-2;
  });
  const issues=await page.evaluate(()=>{
    const issues=[],box=selector=>document.querySelector(selector).getBoundingClientRect();
    const top=box('.follow-main'),left=box('.follow-structure'),effort=box('.target-card'),next=box('.next-card');
    if(top.bottom>left.top+1||top.bottom>effort.top+1)issues.push('timer must be above lower cards');
    if(Math.abs(top.left-left.left)>1||Math.abs(top.right-effort.right)>1)issues.push('timer must span both columns');
    if(left.right>=effort.left||Math.abs(left.top-effort.top)>1||Math.abs(left.bottom-next.bottom)>1)issues.push('timeline must span the lower left');
    if(Math.abs(effort.left-next.left)>1||Math.abs(effort.width-next.width)>1||effort.bottom>=next.top)issues.push('right cards must stack');
    const host=document.querySelector('.follow-timeline'),sequence=host.querySelector('.training-sequence'),insets=getComputedStyle(sequence);
    if(parseFloat(insets.paddingTop)!==0||parseFloat(insets.paddingBottom)!==0||sequence.getBoundingClientRect().height<host.clientHeight-1)issues.push('timeline must fill without centering spacers');
    const rows=sequence.querySelectorAll('.follow-step'),list=sequence.getBoundingClientRect();
    if(Math.abs(rows[0].getBoundingClientRect().top-list.top)>1||Math.abs(rows[rows.length-1].getBoundingClientRect().bottom-list.bottom)>1)issues.push('timeline rows must use the full list height');
    if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document overflow');
    for(const node of document.querySelectorAll('.follow-page .module')){
      const r=node.getBoundingClientRect();if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||node.scrollWidth>node.clientWidth+1)issues.push('module bounds '+node.className);
    }
    for(const node of document.querySelectorAll('.follow-header button,.follow-controls button')){
      const r=node.getBoundingClientRect();if(r.width<43.5||r.height<43.5)issues.push('small button '+node.textContent);
    }
    return issues;
  });
  assert.deepEqual(issues,[],label);
}

const read=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('training-follow-db',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('current');
    r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);
  };
}));

try{
  await fs.mkdir(output,{recursive:true});
  for(const [width,height] of tabletViews){
    for(const index of [0,1]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
      const page=await context.newPage();watch(page);await seed(page,index);
      const name=`follow-ipad-${width}x${height}-${index}`,capture=await page.screenshot({animations:'disabled'});
      const geometry=await page.evaluate(()=>Object.fromEntries(['.follow-main','.follow-structure','.target-card','.next-card','.timer'].map(selector=>{
        const node=document.querySelector(selector),rect=node.getBoundingClientRect();return [selector,{x:rect.x,y:rect.y,width:rect.width,height:rect.height}];
      })));
      if(baseline){
        await fs.writeFile(`${output}/${name}-before.png`,capture);
        await fs.writeFile(`${output}/${name}-before.json`,JSON.stringify(geometry));
      }else{
        const previous=await fs.readFile(`${output}/${name}-before.json`).then(JSON.parse).catch(()=>null);
        if(previous){
          assert.deepEqual(geometry,previous,`${name}: iPad geometry changed`);
          await fs.writeFile(`${output}/${name}-after.png`,capture);
          comparisons.push({name,identicalPng:capture.equals(await fs.readFile(`${output}/${name}-before.png`))});
        }
        const boxes=Object.values(geometry);assert.ok(boxes[0].x>boxes[1].x,'iPad keeps timeline on the left');
      }
      await context.close();
    }
  }
  results.push(baseline?'Captured 8 iPad screenshot baselines':comparisons.length===8?'iPad landscape, compressed landscape and portrait retain identical geometry; before/after screenshots recorded':'iPad original left-timeline layout checked at four sizes; no saved local screenshot baseline');
  if(!baseline){
    const context=await browser.newContext({viewport:{width:420,height:912},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
    const page=await context.newPage();watch(page);await seed(page);
    await phoneBounds(page,'iPhone Air portrait');
    await page.getByRole('heading',{name:'当前目标',exact:true}).waitFor();await page.getByRole('heading',{name:'下一段',exact:true}).waitFor();
    assert.equal(await page.locator('.phone-target-reading strong').innerText(),'13');
    assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).getAttribute('aria-valuenow'),'13');
    assert.equal(await page.locator('.phone-target-summary .filled').count(),13);
    assert.equal(await page.locator('.next-value').innerText(),'6 次 · 12 kg');
    assert.equal(await page.locator('.next-effort').isVisible(),false);
    for(const selector of ['.timer-block .movement-cue','.target-card .detail-card-header','.target-card .target-reading','.next-equipment','.next-preparation','.after-next'])assert.equal(await page.locator(selector).isVisible(),false,selector);
    await page.screenshot({path:`${output}/follow-phone-timed-light.png`});
    results.push('420×912 portrait follows the reference layout; named effort/next cards show core fields and the timeline fills without spacers');
    for(const [width,height] of [[420,740],[393,852],[390,664],[360,640]]){
      await page.setViewportSize({width,height});await phoneBounds(page,`${width}×${height}`);
    }
    await page.setViewportSize({width:420,height:912});
    await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','62px');document.documentElement.style.setProperty('--safe-bottom','34px');});
    await phoneBounds(page,'safe areas');
    await page.screenshot({path:`${output}/follow-phone-safe-area.png`});
    await page.evaluate(()=>{document.documentElement.style.removeProperty('--safe-top');document.documentElement.style.removeProperty('--safe-bottom');});
    await page.emulateMedia({colorScheme:'dark'});await phoneBounds(page,'dark phone');
    await page.screenshot({path:`${output}/follow-phone-timed-dark.png`});
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await phoneBounds(page,'200% phone');
    await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
    await page.setViewportSize({width:912,height:420});assert.equal(await page.locator('.phone-target-summary').isVisible(),false);
    await page.setViewportSize({width:420,height:912});await page.emulateMedia({colorScheme:'light'});
    results.push('Browser-bar compression, smaller phones, safe areas, dark mode, 200% text and orientation changes remain within module bounds');
    await page.getByRole('button',{name:'开始跟练',exact:true}).click();await page.waitForTimeout(1100);
    await page.getByRole('button',{name:'暂停训练',exact:true}).click();const paused=await page.locator('.timer').innerText();
    await page.waitForTimeout(1100);assert.equal(await page.locator('.timer').innerText(),paused);
    await page.getByRole('button',{name:'保存进度并返回首页'}).click();await page.getByRole('button',{name:'继续跟练',exact:true}).waitFor();
    await page.reload();await page.getByRole('button',{name:'继续跟练',exact:true}).click();assert.equal(await page.locator('.timer').innerText(),paused);
    await page.getByRole('button',{name:'继续跟练',exact:true}).click();
    await page.getByRole('heading',{name:'单臂哑铃划船',exact:true}).waitFor({timeout:12000});
    await phoneBounds(page,'timed advance to reps');
    assert.deepEqual(await page.locator('.phone-target-reading strong').allTextContents(),['6','12']);
    assert.equal(await page.locator('.next-value').innerText(),'10 秒');
    assert.equal(await page.locator('.next-effort').isVisible(),false);
    assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).count(),0);
    assert.equal(await page.locator('.phone-current-target').count(),0);
    await page.getByRole('button',{name:'暂停训练',exact:true}).click();
    await page.screenshot({path:`${output}/follow-phone-reps-light.png`});
    await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.waitForTimeout(1100);
    assert.equal(await page.locator('.current-movement h2').innerText(),'单臂哑铃划船');
    await page.getByRole('button',{name:'完成 6 次 · 下一段',exact:true}).click();await phoneBounds(page,'reps confirmed');
    await page.getByRole('button',{name:'结束跟练',exact:true}).click();
    await page.getByRole('button',{name:'保存并返回首页',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
    assert.equal((await read(page)).workouts[0].completed,false);
    results.push('Phone controls preserve pause, refresh/resume, automatic timed advance, manual rep confirmation, current weight and partial records');
    await context.close();
    for(const [index,longName,count,weightedTime] of [[0,true,6],[2,false,6],[3,false,6],[4,false,6],[5,false,6],[0,false,1],[0,false,3],[0,false,6,true]]){
      const context=await browser.newContext({viewport:{width:420,height:912},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});
      const page=await context.newPage();watch(page);await seed(page,index,{longName,count,weightedTime});await phoneBounds(page,longName?'long next name':`stage ${index}`);
      if(longName)await page.screenshot({path:`${output}/follow-phone-long-name.png`});
      if(index===2){assert.equal(await page.locator('.phone-target-reading strong').innerText(),'10');assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).count(),0);assert.equal(await page.locator('.next-effort').isVisible(),true);assert.equal(await page.locator('.next-effort strong').innerText(),'7 / 16');}
      if(index===3){assert.equal(await page.locator('.next-value').innerText(),'5 秒');assert.equal(await page.locator('.next-effort').isVisible(),false);}
      if(index===4){assert.equal(await page.locator('.next-value').innerText(),'8 次');assert.equal(await page.locator('.next-effort').isVisible(),false);}
      if(index===4){assert.equal(await page.locator('.phone-target-reading strong').innerText(),'5');assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).count(),0);}
      if(count<4){assert.equal(await page.locator('.follow-step').count(),count);await page.screenshot({path:`${output}/follow-phone-${count}-stage.png`});}
      if(weightedTime){assert.deepEqual(await page.locator('.phone-target-reading strong').allTextContents(),['20','30']);assert.equal(await page.getByRole('meter',{name:'计划主观用力目标'}).count(),0);await page.screenshot({path:`${output}/follow-phone-weighted-time.png`});}
      if(index===5){
        assert.deepEqual(await page.locator('.phone-target-reading strong').allTextContents(),['8']);
        await page.getByRole('button',{name:'继续跟练',exact:true}).click();await page.getByRole('button',{name:'完成 8 次 · 下一段',exact:true}).click();
        await phoneBounds(page,'finished');await page.getByRole('button',{name:'查看本次训练',exact:true}).click();
        await page.getByRole('button',{name:'保存并返回首页',exact:true}).click();await page.getByRole('button',{name:'进入跟练',exact:true}).waitFor();
        assert.equal((await read(page)).workouts[0].completed,true);
      }
      await context.close();
    }
    results.push('Current target switches between effort, reps/weight, timed load and recovery; long names, short lists and complete-session saving remain usable');
  }
  assert.deepEqual(errors,[]);
  if(!baseline)await fs.writeFile(`${output}/follow-phone-report.json`,JSON.stringify({results,comparisons,errors},null,2));
  console.log(JSON.stringify({baseline,results,comparisons,errors},null,2));
}finally{await browser.close();}
