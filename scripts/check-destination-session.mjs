import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {destinations, destinationInformationPath} from '../src/destinations.js';

const origin=process.argv[2]||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
try {
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function open(path){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   await page.locator('#main-content').waitFor();
  }
  const navigation=page.getByRole('navigation',{name:'Main navigation'});
  const destinationLink=navigation.getByRole('link',{name:'Destinations',exact:true});
  async function assertMenu(destination){
   await page.waitForURL(origin+destinationInformationPath(destination));
   await expect(page.locator('h1')).toHaveText(destination.name);
   await expect(page.locator('.information-card')).toHaveCount(7);
   for(const href of await page.locator('.information-card').evaluateAll(cards=>cards.map(card=>card.getAttribute('href')))){
    assert.ok(href.startsWith(destination.qrCodeUrl+'/'));
   }
   await page.waitForFunction(()=>{
    const menu=document.getElementById('information');
    if(!menu)return false;
    const top=menu.getBoundingClientRect().top;
    const bottom=document.querySelector('.navbar').getBoundingClientRect().bottom;
    return top>=bottom&&top<bottom+48;
   });
   await expect(destinationLink).toHaveAttribute('aria-current','page');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await open('/');
  await expect(destinationLink).toHaveAttribute('href','/destinations');
  await destinationLink.click();
  await expect(page.locator('.destination-card')).toHaveCount(10);
  const first=destinations[6],next=destinations[1];
  await open(destinationInformationPath(first));
  await assertMenu(first);
  await page.locator('.information-card').first().click();
  await page.waitForURL('**/background');
  for(const label of ['Home','Establishments','How It Works']){
   await navigation.getByRole('link',{name:label,exact:true}).click();
   await expect(navigation.locator('a[aria-current="page"]')).toHaveText(label);
   await expect(destinationLink).toHaveAttribute('href',destinationInformationPath(first));
   await destinationLink.click();
   await assertMenu(first);
  }
  await navigation.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.locator('.home-hero')).toHaveCount(1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#main-content').waitFor();
  await destinationLink.click();
  await assertMenu(first);
  await open('/destination/'+next.slug+'#information');
  await navigation.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.locator('.home-hero')).toHaveCount(1);
  await page.locator('footer').getByRole('link',{name:'Destinations',exact:true}).click();
  await assertMenu(next);
  await navigation.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.locator('.home-hero')).toHaveCount(1);
  await page.locator('.hero-actions').getByRole('link',{name:'Explore Destinations'}).click();
  await page.waitForURL(origin+'/destinations');
  await expect(page.locator('.destination-card')).toHaveCount(10);
  await expect(destinationLink).toHaveClass(/active/);
  await open('/destination/unknown#information');
  await destinationLink.click();
  await assertMenu(next);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS: '+(mobile?'mobile':'desktop')+' QR session returns to seven cards after navigation and reload; new QR replaces destination; full directory remains accessible.');
 }
 for(const blockedStorage of [false,true]){
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.addInitScript(blocked=>{
   if(blocked)Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Storage unavailable');}});
   else sessionStorage.setItem('sulyap:last-destination','invalid-destination');
  },blockedStorage);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/');
  const navigation=page.getByRole('navigation',{name:'Main navigation'});
  const link=navigation.getByRole('link',{name:'Destinations',exact:true});
  await link.waitFor();
  await expect(link).toHaveAttribute('href','/destinations');
  await page.goto(origin+destinationInformationPath(destinations[0]));
  await navigation.getByRole('link',{name:'Home',exact:true}).click();
  await link.click();
  await page.waitForURL(origin+destinationInformationPath(destinations[0]));
  await expect(page.locator('.information-card')).toHaveCount(7);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('PASS: invalid saved destination and unavailable session storage recover safely.');
} finally {await browser.close();}
