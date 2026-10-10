import assert from 'node:assert/strict';
import {chromium, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const origin = process.argv[2] || 'http://127.0.0.1:5174';
mkdirSync('.sites-runtime/qa', {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chromium'});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'no-preference'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(origin);
  await page.locator('.startup-screen').waitFor();
  await page.clock.fastForward(2100);
  const collage = page.locator('.hero-destination-collage');
  const frames = collage.locator('.hero-collage-frame.is-active');
  const sources = () => frames.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')));
  await expect(collage).toBeVisible();
  await expect(collage.locator('.hero-collage-tile')).toHaveCount(6);
  await expect(frames).toHaveCount(6);
  await expect(collage.getByRole('button')).toHaveCount(0);
  await expect(collage.locator('.hero-story-controls')).toHaveCount(0);
  await page.waitForFunction(() => [...document.querySelectorAll('.hero-collage-tile img')].every(image => image.complete && image.naturalWidth > 0));
  const initial = await sources();
  assert.deepEqual(initial, [
    '/images/baco-island-2.jpg', '/images/sto-nino-cathedral-1.jpg',
    '/images/silonay-mangrove-conservation-eco-park-1.jpg', '/images/oriental-mindoro-heritage-museum-2.jpg',
    '/images/caluangan-lake-1.jpg', '/images/suqui-beach-2.jpg',
  ], 'The original six place photos must remain in the initial view');
  const culture = [
    '/images/culture/mangyan-smile.webp', '/images/culture/kalap-2.webp',
    '/images/culture/kalap-3.webp', '/images/culture/mangyan-handicrafts.webp',
    '/images/culture/calapan-corn-vendor.webp', '/images/culture/pandang-gitab-lights.webp',
  ];
  const allowed = new Set([...initial, ...culture]);
  assert.ok((await collage.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')))).every(source => allowed.has(source)), 'Only the original places and the six selected culture photos should be used');
  await page.screenshot({path: '.sites-runtime/qa/home-places-desktop.png', fullPage: true, animations: 'disabled'});
  // The full collage must alternate between places-only and culture-only scenes.
  await collage.hover();
  for (let step = 0; step < 4; step++) {
    const before = await sources();
    await page.clock.fastForward(2500);
    const after = await sources();
    after.forEach((source, tile) => {
      assert.notEqual(source, before[tile], `Tile ${tile + 1} should advance automatically`);
    });
    if (step % 2 === 0) {
      assert.deepEqual(after, culture, 'The culture scene must show the Mangyan portrait, handicrafts, a Calapan vendor, two Kalap photos and Pandang Gitab, without place photos');
      assert.equal(new Set(after).size, 6, 'All six culture tiles must use different original photographs');
      await expect(frames.first().locator('img')).toHaveAttribute('alt', /Alangan Mangyan/);
      await expect(frames.last().locator('.hero-collage-label')).toHaveText('Pandang Gitab');
      await expect(collage).toHaveAttribute('data-scene', 'culture');
      if (step === 0) await page.screenshot({path: '.sites-runtime/qa/home-kalap-desktop.png', fullPage: true, animations: 'disabled'});
    } else {
      assert.deepEqual(after, initial, 'The places scene must restore all six original places without festival photos');
      await expect(collage).toHaveAttribute('data-scene', 'places');
    }
  }
  assert.deepEqual(await sources(), initial, 'The slideshow must loop continuously');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(collage).toHaveAttribute('data-playing', 'false');
  await expect(frames.first().locator('img')).toHaveCSS('animation-name', 'none');
  await page.clock.fastForward(15000);
  assert.deepEqual(await sources(), initial);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: '.sites-runtime/qa/home-places-mobile.png', fullPage: true, animations: 'disabled'});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await collage.scrollIntoViewIfNeeded();
  await expect(collage).toHaveAttribute('data-playing', 'true');
  await page.clock.fastForward(2500);
  assert.deepEqual(await sources(), culture, 'Playback should resume into the complete culture scene after a preference change');
  await page.screenshot({path: '.sites-runtime/qa/home-kalap-mobile.png', fullPage: true, animations: 'disabled'});
  assert.deepEqual(errors, []);
  console.log('PASS: six distinct culture photos including a Mangyan portrait and Pandang Gitab, places-only/culture-only autoplay, original place photos retained, reduced motion, and 320–1440px layouts.');
} finally {
  await browser.close();
}
