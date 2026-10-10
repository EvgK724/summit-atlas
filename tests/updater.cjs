/* Run with Playwright installed: node tests/updater.cjs [webkit|chromium]. */
const {webkit,chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.env.ATLAS_ROOT||path.resolve(__dirname,'..');
const docs=fs.existsSync(path.join(root,'docs/index.html'))?path.join(root,'docs'):root;
const html=fs.readFileSync(path.join(docs,'index.html'),'utf8');
const release=JSON.parse(fs.readFileSync(path.join(docs,'version.json'),'utf8'));
const app=release.app,kemet=app==='kemet',item=app==='summit'?'peak':'wonder';
const next={...release,version:'r-'+(release.version.includes('aaaa')?'b':'a').repeat(20)};
const url=`http://atlas.test/${app}-atlas/`;
async function until(page,test){await page.waitForFunction(test,null,{timeout:10000});}
(async()=>{
 const engine=process.argv[2]||'webkit';
 const browser=await(engine==='webkit'?webkit.launch():chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}));
 const context=await browser.newContext({viewport:{width:440,height:956},isMobile:true,hasTouch:true});
 let available=release,delivered=release,manifestFailure=false,requests=0;
 await context.route('http://atlas.test/**',async route=>{
  const req=new URL(route.request().url());
  if(req.pathname.endsWith('version.json')){requests++;return route.fulfill({status:manifestFailure?503:200,contentType:'application/json',body:JSON.stringify(available)});}
  if(req.pathname.endsWith('/')||req.pathname.endsWith('.html'))return route.fulfill({contentType:'text/html',body:html.replaceAll(release.version,delivered.version)});
  return route.fulfill({status:404,body:''});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto(url);
 await page.locator('#text-size').selectOption('xlarge');
 let progress=null;
 if(!kemet){
  await page.locator('[data-mode=learn]').first().click();await page.locator('#practice-all').click();await page.locator('#reveal-answer').click();await page.locator('[data-grade=good]').click();await page.locator('#end-review').click();
  progress=await page.evaluate(key=>localStorage.getItem(key),`${app}-learning-v1`);assert.ok(progress);
  await page.locator('[data-mode=atlas]').first().click();
 }
 const target=kemet?'osireion':app==='summit'?'k2':app==='hepta'?'gardens':'petra';
 await page.locator(kemet?`.monument-card[data-id=${target}]`:`.${item}-card[data-${item}=${target}]`).click();
 const view=kemet?'section':app==='summit'?'heights':'structure';
 await page.locator(`[data-view=${view}]`).click();
 if(kemet)await page.locator('#recall-button').click();
 else{await page.locator('[data-mode=learn]').first().click();await page.locator('#practice-all').click();await page.locator('#reveal-answer').click();}
 const answer=await page.locator(kemet?'#recall-answer':'#card-answer').textContent();
 available=next;delivered=next;
 await page.evaluate(()=>dispatchEvent(new Event('online')));
 await until(page,()=>!document.querySelector('#update-banner').hidden);
 await page.clock.fastForward(12000);
 assert.equal(await page.locator('meta[name=atlas-version]').getAttribute('content'),release.version,'Do not reload an active recall card');
 assert.equal(await page.locator(kemet?'#recall-answer':'#card-answer').textContent(),answer);
 assert.ok(await page.locator('#update-now').isDisabled());
 if(kemet)await page.locator('#recall-button').click();
 else{await page.locator('#end-review').click();await page.locator('[data-mode=atlas]').first().click();}
 await page.clock.fastForward(12000);
 await page.waitForFunction(v=>document.querySelector('meta[name=atlas-version]').content===v,next.version,{timeout:10000});
 assert.equal(await page.locator('#text-size').inputValue(),'xlarge');
 const afterURL=new URL(page.url());assert.equal(afterURL.searchParams.get(kemet?'object':item),target);assert.equal(afterURL.searchParams.get('view'),view);
 if(progress)assert.equal(await page.evaluate(key=>localStorage.getItem(key),`${app}-learning-v1`),progress,'Retain exact progress payload');
 const requestsBefore=requests;await page.clock.fastForward(120000);await page.waitForTimeout(50);assert.ok(requests>requestsBefore,'Periodic checks');
 assert.equal(await page.locator('meta[name=atlas-version]').getAttribute('content'),next.version);
 // Opt-out persists; network failure never navigates or clears progress.
 await page.locator('#about-button').click();await page.locator('#auto-update').uncheck();await page.locator('#about-dialog .close-dialog').click();await page.reload();
 assert.equal(await page.locator('#auto-update').isChecked(),false);const stopped=requests;await page.clock.fastForward(120000);assert.equal(requests,stopped,'No timer polling after opt-out');
 await page.locator('#about-button').click();manifestFailure=true;await page.locator('#check-update').click();await until(page,()=>document.querySelector('#update-status').textContent.includes('Не удалось'));
 assert.equal(await page.locator('meta[name=atlas-version]').getAttribute('content'),next.version);
 manifestFailure=false;available={...next,version:'r-'+'c'.repeat(20)};
 await page.locator('#check-update').click();await until(page,()=>!document.querySelector('#apply-update').hidden);
 await page.locator('#apply-update').click();await until(page,()=>document.querySelector('#update-status').textContent.includes('недоступна целиком'));
 assert.equal(await page.locator('meta[name=atlas-version]').getAttribute('content'),next.version,'Do not load partially published release');
 delivered=available;await page.locator('#apply-update').click();await page.waitForFunction(v=>document.querySelector('meta[name=atlas-version]').content===v,available.version);
 assert.equal(await page.locator('#auto-update').isChecked(),false,'Manual apply preserves opt-out');
 if(progress)assert.equal(await page.evaluate(key=>localStorage.getItem(key),`${app}-learning-v1`),progress);
 // Every application uses its own storage namespace.
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.endsWith('-auto-update'))),[`${app}-auto-update`]);
 assert.equal(errors.length,0,JSON.stringify(errors));
 await context.close();
 async function fault(kind){
  const ctx=await browser.newContext({viewport:{width:440,height:956},isMobile:true,hasTouch:true});
  if(kind==='blocked-session')await ctx.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
  if(kind==='unsaved')await ctx.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){if(this===localStorage)throw new DOMException('Full','QuotaExceededError');return original.apply(this,args);};});
  let nav=0,polls=0,releaseFetch=null,fetchStarted=false;
  await ctx.route('http://atlas.test/**',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('version.json')){polls++;return route.fulfill({contentType:'application/json',body:JSON.stringify(next)});}
   if(u.pathname.endsWith('/')||u.pathname.endsWith('.html')){
    if(req.isNavigationRequest())nav++;
    if(kind==='snooze'&&!req.isNavigationRequest()&&!fetchStarted){fetchStarted=true;await new Promise(resolve=>releaseFetch=resolve);}
    const old=req.isNavigationRequest()&&(nav===1||kind==='stale-navigation'||kind==='stale-root'&&u.pathname.endsWith('/'));
    return route.fulfill({contentType:'text/html',body:old?html:html.replaceAll(release.version,next.version)});
   }
   return route.fulfill({status:404,body:''});
  });
  const p=await ctx.newPage(),faultErrors=[];p.on('pageerror',e=>faultErrors.push(e.message));await p.clock.install();await p.goto(url);
  if(kind==='unsaved'){
   await p.locator('[data-mode=learn]').first().click();await p.locator('#practice-all').click();await p.locator('#reveal-answer').click();await p.locator('[data-grade=good]').click();await p.locator('#end-review').click();
   assert.equal(await p.locator('#seen-count').textContent(),'1');assert.equal(await p.evaluate(()=>window.atlasHasUnsavedProgress),true);
  }
  await until(p,()=>!document.querySelector('#update-banner').hidden);
  await p.clock.fastForward(12000);
  if(kind==='snooze'){
   for(let n=0;!fetchStarted&&n<100;n++)await p.waitForTimeout(10);
   assert.ok(fetchStarted);await p.locator('#update-later').click();await p.clock.fastForward(10000);releaseFetch();await p.waitForTimeout(150);
   assert.equal(nav,1,'Snooze must still apply after delayed prefetch');await p.clock.fastForward(301000);
   await p.waitForFunction(v=>document.querySelector('meta[name=atlas-version]').content===v,next.version);
  }else if(kind==='stale-root'){
   await p.waitForFunction(v=>document.querySelector('meta[name=atlas-version]').content===v,next.version);
   assert.equal(new URL(p.url()).pathname,`/${app}-atlas/index.html`,'Navigate to the exact verified document');
  }else if(kind==='stale-navigation'){
   for(let n=0;nav<2&&n<100;n++)await p.waitForTimeout(20);
   assert.equal(nav,2);await p.clock.fastForward(301000);await p.waitForTimeout(150);assert.equal(nav,2,'A failed version cannot cause an automatic reload loop');
  }else{
   await p.clock.fastForward(120000);await p.waitForTimeout(50);assert.equal(nav,1,'Unsafe handoff is deferred');assert.ok(polls>=2,'Storage failure does not stop checks');
   if(kind==='unsaved'){assert.equal(await p.locator('#seen-count').textContent(),'1');assert.ok(await p.locator('#update-now').isDisabled());}
  }
  assert.equal(faultErrors.length,0,JSON.stringify(faultErrors));await ctx.close();
 }
 for(const kind of ['blocked-session','stale-root','stale-navigation','snooze',...(!kemet?['unsaved']:[])])await fault(kind);
 await browser.close();console.log(`PASS ${app}/${engine}: protected recall, automatic release, exact progress + font + URL, periodic checks, opt-out, failed network, partial release, manual apply, storage faults, canonical URL, no reload loop, in-flight snooze.`);
})().catch(e=>{console.error(e);process.exit(1)});
