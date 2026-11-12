import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import {chromium, expect} from '@playwright/test';
import {destinations} from '../src/destinations.js';

const origin=process.argv[2]||'http://127.0.0.1:5173';
const credits=JSON.parse(readFileSync('scripts/calapan-photo-assets.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
mkdirSync('.sites-runtime/qa',{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const destination of destinations){
  await page.goto(origin+destination.qrCodeUrl+'/images');
  const thumbs=page.locator('.gallery-thumb');
  await expect(thumbs).toHaveCount(destination.images.length);
  await thumbs.locator('img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
  await expect.poll(()=>thumbs.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const last=destination.images.at(-1);
  await thumbs.last().click();
  await expect(page.locator('.lightbox-caption')).toContainText(last.alt);
  await expect(page.locator('.lightbox-caption')).toContainText(`${destination.images.length} / ${destination.images.length}`);
  await expect(page.locator('.gallery-slide.is-current img')).toHaveAttribute('src',last.src);
  await expect.poll(()=>page.locator('.gallery-slide.is-current img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await page.getByRole('button',{name:'Next photo',exact:true}).click();
  await expect(page.locator('.lightbox-caption')).toContainText(`1 / ${destination.images.length}`);
  await page.keyboard.press('Escape');
  if(destination.slug==='aganhao-islet'){
   await expect(thumbs.filter({hasText:'Regional reef photo'})).toHaveCount(2);
   await page.screenshot({path:'.sites-runtime/qa/expanded-island-gallery-mobile.png',fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(origin+'/destination/3/images');
 await expect(page.locator('.gallery-thumb')).toHaveCount(destinations[2].images.length);
 await page.locator('.gallery-thumb img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
 await expect.poll(()=>page.locator('.gallery-thumb img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
 await page.screenshot({path:'.sites-runtime/qa/expanded-museum-gallery-desktop.png',fullPage:true});
 await page.goto(origin+'/photo-credits.html');
 for(const photo of credits)await expect(page.getByText(photo.file,{exact:true})).toHaveCount(1);
 await expect(page.locator('#establishments')).toBeVisible();
 await expect(page.locator('#mindoro-culture')).toBeVisible();
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${credits.length} gallery views decode, last-photo indicators and wrap work for all ten destinations, regional labels and all credits are present.`);
}finally{await browser.close();}
