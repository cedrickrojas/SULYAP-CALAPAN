import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {destinations} from '../src/destinations.js';
mkdirSync('.sites-runtime/qa',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin='http://127.0.0.1:5173';
const expectedSections=[['background','Destination Information and Description'],['operatingHours','Operating Hours and Fees'],['thingsToDo','Available Activities'],['images','Destination Images'],['rules','Precautionary Measures'],['contactInformation','Contact Details and Information'],['directions','Destination Transportation Details']];
// The separate startup check measures real time; advance it in route regression checks.
await page.clock.install();
async function openPage(target,url,options){
 await target.goto(url,options);
 await target.waitForFunction(()=>document.querySelector('.startup-screen')||document.querySelector('#main-content'));
 if(await target.locator('.startup-screen').count())await target.clock.fastForward(4100);
 await target.locator('#main-content').waitFor({state:'attached'});
}
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Horizontal overflow at '+page.url());}
if(!process.argv.includes('--visitor-details-only')){
await openPage(page,origin,{waitUntil:'networkidle'});
assert.equal(await page.locator('.home-hero').count(),1);
assert.equal(await page.locator('main .destination-card').count(),0);
await noOverflow();
await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:'.sites-runtime/qa/home-desktop.png',fullPage:true});
for(const d of destinations){
 await openPage(page,origin+d.qrCodeUrl);
 assert.equal(await page.locator('h1').innerText(),d.name);
 assert.equal(await page.locator('.destination-hero.photo-pending').count(),d.images[0].placeholder?1:0);
 assert.equal(await page.locator('.information-card').count(),7);
 assert.deepEqual(await page.locator('.information-card h3').allTextContents(),expectedSections.map(([,title])=>title));
 const images=await page.locator('.gallery-thumb img').evaluateAll(imgs=>imgs.map(img=>img.src));
 assert.equal(images.length,3);assert.equal(new Set(images).size,3);
 await noOverflow();
 for(const [section,title] of expectedSections){
  await openPage(page,origin+d.qrCodeUrl+'/'+section);assert.equal(await page.locator('h1').innerText(),title);
  assert.ok((await page.locator('.detail-content').innerText()).length>80);
  assert.equal(await page.locator('.back-link').getAttribute('href'),d.qrCodeUrl+'#information');
  if(section==='directions'){
   assert.ok((await page.locator('.detail-content').innerText()).includes(d.address));
   const embed=await page.locator('.map-section iframe').getAttribute('src');
   if(d.latitude===null){assert.ok(!embed.includes('marker='),'Unverified places must not receive invented map pins');assert.ok((await page.locator('.coordinates').innerText()).includes('awaiting verification'));}
   else assert.ok(embed.includes('marker='+d.latitude+','+d.longitude));
   assert.ok((await page.locator('.map-section a.button').getAttribute('href')).includes(encodeURIComponent(d.name)), 'Map search must identify the selected destination');
  }
  const text=await page.locator('.detail-content').innerText();
  if(section==='background'){
   for(const paragraph of d.background.split(/\n\s*\n/))assert.ok(text.includes(paragraph));
   assert.ok(text.includes(d.bestTimeToVisit));for(const place of d.nearbyPlaces)assert.ok(text.includes(place));
  }
  if(section==='operatingHours'){assert.ok(text.includes(d.operatingHours));assert.ok(text.includes(d.entranceFee));}
  if(section==='thingsToDo')for(const item of [...d.thingsToDo,...d.attractions])assert.ok(text.includes(item));
  if(section==='rules')for(const item of [...d.precautionaryMeasures,...d.rules,...d.travelTips,...Object.values(d.visitorPlanning)])assert.ok(text.includes(item));
  if(section==='images'){
   assert.equal(await page.locator('.detail-gallery .gallery-thumb').count(),3);
   await page.locator('.gallery-thumb').first().click();await page.locator('dialog.lightbox[open]').waitFor();await page.keyboard.press('Escape');
  }
  if(section==='directions'&&d.directionsQuery){assert.ok((await page.getByRole('link',{name:'Find Tourism Office'}).getAttribute('href')).includes(encodeURIComponent(d.directionsQuery)));}
 }
 console.log('PASS: '+d.name+' has exactly seven named sections, combined content, destination images, and map/transportation details.');
}
for(const [oldSection,newSection] of Object.entries({location:'directions',entranceFee:'operatingHours',attractions:'thingsToDo',bestTimeToVisit:'background',travelTips:'rules',nearbyPlaces:'background'})){
 await openPage(page,origin+'/destination/'+destinations[0].slug+'/'+oldSection);await page.waitForURL('**/'+newSection);await page.locator('.detail-content').waitFor();
}
console.log('PASS: old section links redirect to their combined pages.');
await openPage(page,origin+"/destination/"+destinations[0].slug);assert.equal(await page.locator('h1').innerText(),destinations[0].name);
await page.locator('.gallery-thumb').first().click();await page.locator('dialog.lightbox[open]').waitFor();await page.getByRole('button',{name:'Next photo'}).click();assert.ok((await page.locator('.lightbox-caption').innerText()).includes('2 / 3'));await page.keyboard.press('ArrowLeft');assert.ok((await page.locator('.lightbox-caption').innerText()).includes('1 / 3'));await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
await openPage(page,origin+'/destinations');assert.equal(await page.locator('.destination-card').count(),10);await page.getByRole('button',{name:"View QR code for "+destinations[0].name}).click();await page.locator('.qr-dialog[open]').waitFor();await page.getByRole('button',{name:'Close QR code'}).click();assert.equal(await page.locator('dialog[open]').count(),0);
await openPage(page,origin+'/qr-directory');await page.waitForFunction(()=>document.querySelectorAll('.qr-card .qr-image').length===10);
for(let i=0;i<10;i++){const card=page.locator('.qr-card').nth(i);assert.equal(await card.locator('a').count(),0,'QR cards should open destinations through scanning');await card.locator('.qr-image').screenshot({path:'.sites-runtime/qa/qr-'+(i+1)+'.png'});}
const scannedPage=await context.newPage();await scannedPage.setViewportSize({width:390,height:844});
for(const d of destinations){
 await openPage(scannedPage,origin+d.qrCodeUrl+'#information');
 await scannedPage.waitForFunction(()=>{const menu=document.getElementById('information');return menu&&menu.getBoundingClientRect().top>=document.querySelector('.navbar').getBoundingClientRect().bottom&&menu.getBoundingClientRect().top<document.querySelector('.navbar').getBoundingClientRect().bottom+48;});
 const firstCard=await scannedPage.locator('.information-card').first().boundingBox();assert.ok(firstCard.y>0&&firstCard.y+firstCard.height<844,'Information menu must be visible immediately after scanning');
 await scannedPage.locator('.information-card').first().click();assert.ok(scannedPage.url().endsWith('/background'));
 await scannedPage.locator('.back-link').click();await scannedPage.waitForFunction(()=>document.getElementById('information')?.getBoundingClientRect().top<document.querySelector('.navbar').getBoundingClientRect().bottom+48);
}
await scannedPage.close();console.log('PASS: all ten scanned QR links immediately show the information menu on mobile; section and back navigation work.');
const downloadEvent=page.waitForEvent('download');await page.locator('.qr-card').first().getByRole('button',{name:'Download QR'}).click();const download=await downloadEvent;assert.ok(download.suggestedFilename().endsWith('.svg'));await download.saveAs('.sites-runtime/qa/downloaded-qr.svg');
await page.evaluate(()=>{const observer=new MutationObserver(()=>{document.querySelectorAll('iframe[title=\"Printable destination QR code\"]').forEach(frame=>{frame.contentWindow.print=()=>window.__qrPrinted=true;});});observer.observe(document.body,{childList:true,subtree:true});});
await page.locator('.qr-card').first().getByRole('button',{name:'Print QR'}).click();await page.waitForFunction(()=>window.__qrPrinted===true);assert.equal(await page.frameLocator('iframe[title="Printable destination QR code"]').locator('h1').innerText(),destinations[0].name);console.log('PASS: QR directory, SVG download, print label, and gallery controls.');
for(const path of ['/','/destinations','/destination/1','/destination/5/location','/destination/3/contactInformation','/destination/2/contactInformation','/qr-directory','/about','/how-it-works']){
 await page.setViewportSize({width:390,height:844});await openPage(page,origin+path);await noOverflow();
}
}
// Verify the expanded information remains usable on a narrow phone screen.
await page.setViewportSize({width:360,height:800});
for(const d of destinations){
 for(const section of ['rules','directions','contactInformation','operatingHours','images']){
  await openPage(page,origin+d.qrCodeUrl+'/'+section);await noOverflow();
  if(section==='rules'){
   assert.equal(await page.locator('.detail-list').count(),3,'Precautions, site rules, and travel tips must all be available');
   assert.equal(await page.getByRole('link',{name:'Call 911',exact:true}).getAttribute('href'),'tel:911');
  }
  if(section==='contactInformation'){
   assert.equal(await page.locator('a[href="tel:09672336074"]').count(),1,'Every destination needs a working local tourism assistance link');
   assert.ok((await page.locator('.detail-content').innerText()).includes('not destination opening hours'),'Office hours must be distinguished from destination hours');
  }
  if(section==='directions')assert.ok((await page.locator('.directions-list').innerText()).includes('Return Journey'),'Transport details must include the return arrangement');
 }
 await openPage(page,origin+d.qrCodeUrl+'/background');
 await page.getByRole('link',{name:'View Destination Images',exact:true}).click();
 await page.waitForURL('**/images');
 await page.locator('.detail-gallery').waitFor();
 assert.equal(await page.locator('.gallery-thumb').count(),3);await noOverflow();
}
await openPage(page,origin+'/destination/7/rules');await page.screenshot({path:'.sites-runtime/qa/precautions-mobile.png',fullPage:true});
await openPage(page,origin+'/destination/3/contactInformation');await page.screenshot({path:'.sites-runtime/qa/contacts-mobile.png',fullPage:true});
console.log('PASS: all ten expanded visitor guides fit a 360px screen; precautions, tourism assistance, return arrangements, and gallery links work.');
await openPage(page,origin);assert.equal(await page.locator('.menu-toggle').count(),0);await page.locator('nav').getByRole('link',{name:'Destinations',exact:true}).click();assert.ok(page.url().endsWith('/destinations'));assert.equal(await page.locator('nav[aria-label="Main navigation"] a:visible').count(),5);
await openPage(page,origin);await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:'.sites-runtime/qa/home-mobile.png',fullPage:true});
await openPage(page,origin+'/destination/1');await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:'.sites-runtime/qa/destination-mobile.png',fullPage:true});
await openPage(page,origin+'/unknown-place');assert.ok((await page.locator('h1').innerText()).includes('isn’t on the map'));
assert.deepEqual(errors,[]);console.log('PASS: mobile layouts, navigation, invalid-route recovery, and no browser runtime errors.');
await browser.close();
