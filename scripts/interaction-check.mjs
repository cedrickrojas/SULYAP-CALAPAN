import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {destinations} from '../src/destinations.js';
mkdirSync('.sites-runtime/qa',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin='http://127.0.0.1:5173';
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Horizontal overflow at '+page.url());}
await page.goto(origin+'/qr-directory');await page.waitForFunction(()=>document.querySelectorAll('.qr-card .qr-image').length===10);
for(let i=0;i<10;i++){const card=page.locator('.qr-card').nth(i);assert.equal(await card.locator('a').count(),0,'QR cards should open destinations through scanning');await card.locator('.qr-image').screenshot({path:'.sites-runtime/qa/qr-'+(i+1)+'.png'});}
const scannedPage=await context.newPage();await scannedPage.setViewportSize({width:390,height:844});
for(const d of destinations){
 await scannedPage.goto(origin+d.qrCodeUrl+'#information');
 await scannedPage.waitForFunction(()=>{const menu=document.getElementById('information');return menu&&menu.getBoundingClientRect().top>=document.querySelector('.navbar').getBoundingClientRect().bottom&&menu.getBoundingClientRect().top<document.querySelector('.navbar').getBoundingClientRect().bottom+48;});
 const firstCard=await scannedPage.locator('.information-card').first().boundingBox();assert.ok(firstCard.y>0&&firstCard.y+firstCard.height<844,'Information menu must be visible immediately after scanning');
 await scannedPage.locator('.information-card').first().click();assert.ok(scannedPage.url().endsWith('/background'));
 await scannedPage.locator('.back-link').click();await scannedPage.waitForFunction(()=>document.getElementById('information')?.getBoundingClientRect().top<document.querySelector('.navbar').getBoundingClientRect().bottom+48);
}
await scannedPage.close();console.log('PASS: all ten scanned QR links immediately show the information menu on mobile; section and back navigation work.');
const downloadEvent=page.waitForEvent('download');await page.locator('.qr-card').first().getByRole('button',{name:'Download QR'}).click();const download=await downloadEvent;assert.ok(download.suggestedFilename().endsWith('.svg'));await download.saveAs('.sites-runtime/qa/downloaded-qr.svg');
await page.evaluate(()=>{const observer=new MutationObserver(()=>{document.querySelectorAll('iframe[title=\"Printable destination QR code\"]').forEach(frame=>{frame.contentWindow.print=()=>window.__qrPrinted=true;});});observer.observe(document.body,{childList:true,subtree:true});});
await page.locator('.qr-card').first().getByRole('button',{name:'Print QR'}).click();await page.waitForFunction(()=>window.__qrPrinted===true);assert.equal(await page.frameLocator('iframe[title="Printable destination QR code"]').locator('h1').innerText(),destinations[0].name);console.log('PASS: QR directory, SVG download, print label, and gallery controls.');
for(const path of ['/','/destinations','/destination/1','/destination/5/location','/qr-directory','/about','/how-it-works']){
 await page.setViewportSize({width:390,height:844});await page.goto(origin+path);await noOverflow();
}
await page.goto(origin);assert.equal(await page.locator('.menu-toggle').count(),0);await page.locator('nav').getByRole('link',{name:'Destinations',exact:true}).click();assert.ok(page.url().endsWith('/destinations'));assert.equal(await page.locator('nav[aria-label="Main navigation"] a:visible').count(),5);
await page.goto(origin);await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:'.sites-runtime/qa/home-mobile.png',fullPage:true});
await page.goto(origin+'/destination/1');await page.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:'.sites-runtime/qa/destination-mobile.png',fullPage:true});
await page.goto(origin+'/unknown-place');assert.ok((await page.locator('h1').innerText()).includes('isn’t on the map'));
assert.deepEqual(errors,[]);console.log('PASS: mobile layouts, navigation, invalid-route recovery, and no browser runtime errors.');
await browser.close();
