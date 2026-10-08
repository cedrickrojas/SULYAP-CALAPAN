import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('.sites-runtime/qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},reducedMotion:mobile?'reduce':'no-preference'});
  await context.addInitScript(()=>{
   window.__startupDurations=[];
   let start=null;
   new MutationObserver(()=>{
    const visible=Boolean(document.querySelector('.startup-screen'));
    if(visible&&start===null)start=performance.now();
    if(!visible&&start!==null){window.__startupDurations.push(performance.now()-start);start=null;}
   }).observe(document,{childList:true,subtree:true});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const path=mobile?'/destination/7#information':'/';
  await page.goto('http://127.0.0.1:5173'+path,{waitUntil:'domcontentloaded'});
  await page.getByRole('status',{name:'Loading Sulyap'}).waitFor();
  await page.locator('.startup-logo').evaluate(image=>image.decode());
  assert.equal(await page.locator('main, .navbar, footer').count(),0,'Loading screen should be the only interactive page content');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(mobile)assert.equal(await page.locator('.startup-logo').evaluate(image=>getComputedStyle(image).animationName),'none');
  await page.screenshot({path:'.sites-runtime/qa/startup-'+(mobile?'mobile':'desktop')+'.png'});
  await page.locator('#main-content').waitFor({state:'visible'});
  const duration=await page.evaluate(()=>window.__startupDurations[0]);
  assert.ok(duration>=3000&&duration<=5000,'Startup duration outside 3–5 seconds: '+duration);
  assert.equal(await page.locator('footer .logo, footer .brand-artwork, footer img').count(),0);
  if(mobile){
   assert.ok(page.url().endsWith('/destination/7#information'));
   await page.waitForFunction(()=>{const top=document.getElementById('information').getBoundingClientRect().top;const headerBottom=document.querySelector('.navbar').getBoundingClientRect().bottom;return top>=headerBottom&&top<headerBottom+48;});
   await page.locator('.information-card').first().click();
   assert.ok(page.url().endsWith('/destination/7/background'));
  }else{
   await page.locator('.hero-actions').getByRole('link',{name:'Explore Destinations'}).click();
   assert.ok(page.url().endsWith('/destinations'));
   await page.locator('.destination-card').first().waitFor();
   assert.equal(await page.locator('.destination-card').count(),10);
  }
  assert.equal(await page.locator('.startup-screen').count(),0);
  assert.equal(await page.evaluate(()=>window.__startupDurations.length),1,'Internal navigation must not restart the screen');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('status',{name:'Loading Sulyap'}).waitFor();
  await page.locator('#main-content').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('PASS: '+(mobile?'mobile QR entry with reduced motion':'desktop home entry')+'; loading '+Math.round(duration)+'ms, internal navigation, reload, and no footer logo.');
  await context.close();
 }
} finally {await browser.close();}
