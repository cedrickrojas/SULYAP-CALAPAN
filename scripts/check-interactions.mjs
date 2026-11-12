import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium, expect} from '@playwright/test';
import {establishments} from '../src/establishments.js';

const origin = process.argv[2] || 'http://127.0.0.1:5173';
mkdirSync('.sites-runtime/qa', {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chromium'});
const errors = [];
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function open(path) {
    const response = await page.goto(origin + path);
    assert.equal(response.status(), 200);
    await page.locator('nav').waitFor();
  }
  async function noOverflow() {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), page.url());
  }
  async function highlightAligned() {
    await expect.poll(async () => {
      const active = await page.locator('.establishment-filters button[aria-pressed="true"]').boundingBox();
      const highlight = await page.locator('.filter-highlight').boundingBox();
      return Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(active[key] - highlight[key])));
    }).toBeLessThan(2);
  }
  await open('/');
  await expect(page.getByRole('group', {name: 'Collage scenes'})).toHaveCount(0);
  const tile = page.locator('.hero-collage-tile').first();
  await tile.hover();
  await expect(tile.getByRole('link')).toBeVisible();
  await expect(page.locator('.hero-destination-collage')).toHaveAttribute('data-playing', 'false');
  await tile.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(tile.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await page.screenshot({path: '.sites-runtime/qa/interactions-home-desktop.png', fullPage: true});
  await tile.getByRole('link').click();
  await expect(page).toHaveURL(/\/destination\/9#information$/);
  await expect(page.locator('.information-card')).toHaveCount(7);

  // Check the page fade while navigating without a reload.
  await page.evaluate(() => {
    window.__routeFades = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.id === 'main-content') window.__routeFades.push(options.duration);
      return original.call(this, frames, options);
    };
  });
  await page.locator('nav').getByRole('link', {name: 'Establishments', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.__routeFades.includes(240))).toBe(true);
  for (const category of ['Malls', 'Restaurants', 'Hotels']) {
    await page.getByRole('button', {name: new RegExp(`^${category}`)}).click();
    await expect(page.locator('.establishment-card')).toHaveCount(establishments.filter(place => place.category === category.toLowerCase()).length);
    await highlightAligned();
  }
  await page.goBack();
  await expect(page.getByRole('button', {name: /^Restaurants/})).toHaveAttribute('aria-pressed', 'true');
  await highlightAligned();
  await page.setViewportSize({width: 320, height: 844});
  await highlightAligned();
  await noOverflow();
  await page.screenshot({path: '.sites-runtime/qa/interactions-filters-mobile.png'});

  await open('/destination/1/images');
  await page.locator('.gallery-thumb').first().click();
  await expect(page.locator('.lightbox[open]')).toBeVisible();
  await page.getByRole('button', {name: 'Next photo', exact: true}).click();
  await expect(page.locator('.lightbox-caption')).toContainText('2 / 3');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.lightbox-caption')).toContainText('1 / 3');
  await page.getByRole('button', {name: 'Show photo 3', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Show photo 3', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  // A real pointer drag wraps from the last image to the first.
  const bounds = await page.locator('.gallery-slide.is-current img').boundingBox();
  const x = bounds.x + bounds.width * .5, y = bounds.y + bounds.height * .5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y, {steps: 8});
  await page.mouse.up();
  await expect(page.locator('.lightbox-caption')).toContainText('1 / 3');
  await expect(page.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  await page.screenshot({path: '.sites-runtime/qa/interactions-gallery-mobile.png'});
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox[open]')).toHaveCount(0);

  await open('/destinations');
  await page.locator('.destination-card').first().getByRole('button').click();
  const qr = page.locator('.qr-dialog[open] .qr-image');
  await expect(qr).toBeVisible();
  await page.getByRole('button', {name: 'Copy link', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Copied!', exact: true})).toBeVisible();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).endsWith('/destination/1#information'));
  await expect(page.getByRole('button', {name: 'Copy link', exact: true})).toBeVisible();
  const qrBounds = await qr.boundingBox();
  await page.waitForTimeout(350);
  assert.deepEqual(await qr.boundingBox(), qrBounds);
  await expect(qr).toHaveCSS('animation-name', 'none');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', {configurable: true, value: async () => {throw new Error('Denied');}}));
  await page.getByRole('button', {name: 'Copy link', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('could not be copied');
  await expect(page.getByRole('button', {name: 'Copied!', exact: true})).toHaveCount(0);
  await noOverflow();
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.__routeFades = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.id === 'main-content') window.__routeFades.push(options.duration);
      return original.call(this, frames, options);
    };
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('nav').getByRole('link', {name: 'Home', exact: true}).click();
  const fadeCount = await page.evaluate(() => window.__routeFades?.length || 0);
  await page.locator('nav').getByRole('link', {name: 'Establishments', exact: true}).click();
  assert.equal(await page.evaluate(() => window.__routeFades?.length || 0), fadeCount);
  await expect(page.locator('.filter-results')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', {name: /^Malls/}).click();
  await highlightAligned();
  await expect(page.locator('.motion-pending')).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    await noOverflow();
  }
  await open('/');
  await expect(page.locator('.hero-destination-collage')).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('.hero-destination-collage')).toHaveAttribute('data-scene', 'places');
  await page.setViewportSize({width: 320, height: 844});
  await page.locator('.collage-preview').first().click();
  await expect(page.locator('.collage-explore').first()).toBeVisible();
  await noOverflow();
  const mobile = await browser.newContext({hasTouch: true, isMobile: true, viewport: {width: 390, height: 844}});
  const touchPage = await mobile.newPage();
  touchPage.on('pageerror', error => errors.push(error.message));
  await touchPage.goto(origin + '/destination/1/images');
  await touchPage.locator('.gallery-thumb').first().tap();
  await expect(touchPage.locator('.lightbox[open]')).toHaveCSS('opacity', '1');
  const session = await mobile.newCDPSession(touchPage);
  const viewportBefore = await touchPage.locator('.gallery-viewport').boundingBox();
  async function swipe(dx, dy, cancel = false, hold = 0) {
    await expect(touchPage.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
    const box = await touchPage.locator('.gallery-slide.is-current img').boundingBox();
    const startX = box.x + box.width * .65, startY = box.y + box.height * .4;
    const offsetBefore = await touchPage.locator('.gallery-track').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m41);
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: startX, y: startY}]});
    for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: startX + dx * i / 8, y: startY + dy * i / 8}]});
    if (Math.abs(dx) === 100 && !cancel) {
      await expect.poll(async () => touchPage.locator('.gallery-track').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m41)).toBeLessThan(offsetBefore - 85);
      await touchPage.screenshot({path: '.sites-runtime/qa/gallery-following-touch.png'});
    }
    if (hold) await touchPage.waitForTimeout(hold);
    await session.send('Input.dispatchTouchEvent', {type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: []});
    await expect(touchPage.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  }
  await swipe(-100, 4);
  await expect(touchPage.locator('.lightbox-caption')).toContainText('2 / 3');
  await swipe(10, 90);
  await expect(touchPage.locator('.lightbox-caption')).toContainText('2 / 3');
  await swipe(-60, 2, true);
  await expect(touchPage.locator('.lightbox-caption')).toContainText('2 / 3');
  await swipe(-28, 1, false, 130);
  await expect(touchPage.locator('.lightbox-caption')).toContainText('2 / 3');
  assert.deepEqual(await touchPage.locator('.gallery-viewport').boundingBox(), viewportBefore, 'Photo aspect ratios must not move the controls');
  const imageBox = await touchPage.locator('.gallery-slide.is-current img').boundingBox();
  const arrowBox = await touchPage.getByRole('button', {name: 'Next photo', exact: true}).boundingBox();
  assert.ok(arrowBox.y >= imageBox.y && arrowBox.y + arrowBox.height <= imageBox.y + imageBox.height, 'Gallery arrows should stay beside the photo');
  await touchPage.screenshot({path: '.sites-runtime/qa/interactions-touch-gallery.png'});
  await touchPage.getByRole('button', {name: 'Next photo', exact: true}).tap();
  await touchPage.getByRole('button', {name: 'Next photo', exact: true}).tap();
  await expect(touchPage.locator('.lightbox-caption')).toContainText('1 / 3');
  await expect(touchPage.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  await touchPage.emulateMedia({reducedMotion: 'reduce'});
  await touchPage.getByRole('button', {name: 'Next photo', exact: true}).tap();
  await expect(touchPage.locator('.lightbox-caption')).toContainText('2 / 3');
  await expect(touchPage.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  assert.equal(await touchPage.locator('.gallery-track').evaluate(node => node.getAnimations().length), 0);
  await touchPage.emulateMedia({reducedMotion: 'no-preference'});
  await touchPage.getByRole('button', {name: 'Next photo', exact: true}).tap();
  await touchPage.setViewportSize({width: 844, height: 390});
  await expect(touchPage.locator('.gallery-stage')).toHaveAttribute('data-state', 'idle');
  await expect(touchPage.locator('.lightbox-caption')).toContainText('3 / 3');
  const closeBox = await touchPage.getByRole('button', {name: 'Close gallery', exact: true}).boundingBox();
  assert.ok(closeBox.y >= 0 && closeBox.y + closeBox.height <= 390, 'Close control must remain visible after rotation');
  await touchPage.getByRole('button', {name: 'Next photo', exact: true}).tap();
  await touchPage.getByRole('button', {name: 'Close gallery', exact: true}).tap();
  await expect(touchPage.locator('.lightbox[open]')).toHaveCount(0);
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log('PASS: collage preview/navigation, page fade, category filtering/history/resizing, gallery drag/touch/keys/indicators, copy success/failure, steady QR, mobile layout, and reduced motion.');
} finally {
  await browser.close();
}
