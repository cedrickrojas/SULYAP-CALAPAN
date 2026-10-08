import assert from 'node:assert/strict';
import {chromium, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const origin = process.argv[2] || 'http://127.0.0.1:5174';
mkdirSync('.sites-runtime/qa', {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chromium'});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'no-preference'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const open = async path => {
    const response = page.url() === origin + path
      ? await page.reload({waitUntil: 'domcontentloaded'})
      : await page.goto(origin + path, {waitUntil: 'domcontentloaded'});
    assert.equal(response.status(), 200);
    await page.locator('nav').waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const settled = async locator => {
    await expect(locator).not.toHaveClass(/motion-pending/);
    await expect(locator).toHaveCSS('opacity', '1');
  };
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await open('/');
  await expect(page.locator('.hero-content h1')).toHaveClass(/motion-enter/);
  await expect(page.locator('.hero-content h1')).toHaveCSS('animation-name', 'sulyap-reveal');
  await expect(page.locator('.hero-background')).toHaveCSS('animation-name', 'sulyap-landscape');
  await settled(page.locator('.hero-content h1'));
  await page.locator('nav').getByRole('link', {name: 'Destinations', exact: true}).click();
  await expect(page.locator('.destination-card')).toHaveCount(10);
  const last = page.locator('.destination-card').last();
  await expect(last).toHaveClass(/motion-pending/);
  await expect(last).toHaveCSS('opacity', '0');
  // Focusing a control inside an unrevealed card must show it immediately.
  await last.getByRole('button').focus();
  await settled(last);
  const secondRow = page.locator('.destination-card').nth(4);
  await secondRow.evaluate(node => node.scrollIntoView({behavior: 'instant', block: 'center'}));
  await settled(secondRow);
  await expect(secondRow).toHaveCSS('animation-name', 'sulyap-reveal');
  await noOverflow();

  await page.locator('.destination-card').first().getByRole('button').click();
  const dialog = page.locator('.qr-dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.qr-image')).toBeVisible();
  await expect(dialog).toHaveCSS('opacity', '1');
  const qr = dialog.locator('.qr-image');
  const initial = await qr.boundingBox();
  await page.waitForTimeout(350);
  assert.deepEqual(await qr.boundingBox(), initial, 'QR art must remain steady');
  await expect(qr).toHaveCSS('animation-name', 'none');
  assert.equal(await dialog.locator('a').count(), 0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  await open('/establishments');
  await page.getByRole('button', {name: 'Malls', exact: false}).click();
  await expect(page.locator('.establishment-card')).toHaveCount(4);
  const mall = page.locator('.establishment-card').first();
  await settled(mall);
  await mall.hover();
  await expect(mall).not.toHaveCSS('transform', 'none');
  await page.setViewportSize({width: 320, height: 844});
  await noOverflow();
  await page.locator('.establishment-card').last().evaluate(node => node.scrollIntoView({behavior: 'instant', block: 'center'}));
  await settled(page.locator('.establishment-card').last());
  await noOverflow();
  await page.screenshot({path: '.sites-runtime/qa/motion-mobile.png'});

  const pending = page.locator('.motion-pending').first();
  assert.ok(await pending.count(), 'The page should still contain offscreen reveal targets');
  await page.emulateMedia({media: 'print'});
  await expect(pending).toHaveCSS('opacity', '1');
  await page.emulateMedia({media: 'screen'});

  await open('/destination/1#information');
  await settled(page.locator('.information-card').first());
  await page.waitForFunction(() => {
    const top = document.getElementById('information').getBoundingClientRect().top;
    const bottom = document.querySelector('.navbar').getBoundingClientRect().bottom;
    return top >= bottom && top < bottom + 48;
  });

  // Changing the OS/browser preference must reveal all pending content immediately.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('.motion-pending')).toHaveCount(0);
  await expect(page.locator('.information-card').first()).toHaveCSS('animation-name', 'none');
  await open('/destination/1#information');
  await expect(page.locator('.information-card')).toHaveCount(7);
  await expect(page.locator('.motion-pending')).toHaveCount(0);
  await page.waitForFunction(() => {
    const top = document.getElementById('information').getBoundingClientRect().top;
    const bottom = document.querySelector('.navbar').getBoundingClientRect().bottom;
    return top >= bottom && top < bottom + 48;
  });
  await page.locator('.information-card').first().click();
  await expect(page.locator('h1')).toHaveText('Destination Information and Description');
  await page.locator('.back-link').click();
  await expect(page.locator('.information-card')).toHaveCount(7);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect(page.locator('.information-card').first()).toHaveClass(/motion-enter/);
  await settled(page.locator('.information-card').first());
  await page.locator('.gallery-thumb').first().click();
  await expect(page.locator('.lightbox[open]')).toBeVisible();
  await page.getByRole('button', {name: 'Next photo'}).click();
  await expect(page.locator('.lightbox-caption')).toContainText('2 / 3');
  await expect(page.locator('.lightbox-main > img')).toHaveCSS('animation-name', 'sulyap-photo');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox[open]')).toHaveCount(0);
  await noOverflow();

  // Browsers without IntersectionObserver must still show the full directory.
  const fallback = await browser.newPage({viewport: {width: 390, height: 844}});
  await fallback.addInitScript(() => {delete window.IntersectionObserver;});
  await fallback.goto(origin + '/destinations', {waitUntil: 'domcontentloaded'});
  await fallback.locator('nav').waitFor();
  await expect(fallback.locator('.motion-pending')).toHaveCount(0);
  await expect(fallback.locator('.destination-card').last()).toHaveCSS('opacity', '1');
  assert.deepEqual(errors, []);
  console.log('PASS: scroll reveals, keyboard visibility, steady QR, filters, mobile layout, print visibility, reduced-motion changes, QR anchors, gallery transitions, and observer fallback.');
} finally {
  await browser.close();
}
