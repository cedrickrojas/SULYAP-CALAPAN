import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const origin = process.argv[2] || 'http://127.0.0.1:5173';
mkdirSync('.sites-runtime/qa', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36 [FBAN/Orca-Android;FBAV/480.0.0.0.0]';
const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/MessengerForiOS;FBAV/480.0.0.0.0]';
const errors = [];

async function openPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}

async function ready(page, path = '/destination/1/qr') {
  await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Download QR', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.qr-tools button').disabled);
}

try {
  const desktop = await openPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.page.goto(origin + '/destinations', { waitUntil: 'domcontentloaded' });
  await desktop.page.getByRole('button', { name: /^View QR code for / }).first().click();
  await desktop.page.waitForFunction(() => !document.querySelector('.qr-tools button').disabled);
  const downloaded = desktop.page.waitForEvent('download');
  await desktop.page.getByRole('button', { name: 'Download QR', exact: true }).click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /^sulyap-01-.+-qr\.png$/);
  await download.saveAs('.sites-runtime/qa/downloaded-qr.png');
  const png = readFileSync('.sites-runtime/qa/downloaded-qr.png');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1000);
  assert.equal(png.readUInt32BE(20), 1000);
  await desktop.page.evaluate(() => {
    window.print = () => {
      const image = document.querySelector('.qr-print-sheet.is-active img');
      window.__printed = { ready: image.complete && image.naturalWidth === 1000, activation: navigator.userActivation.isActive };
    };
  });
  await desktop.page.getByRole('button', { name: 'Print QR', exact: true }).click();
  assert.deepEqual(await desktop.page.evaluate(() => window.__printed), { ready: true, activation: true });
  await desktop.page.emulateMedia({ media: 'print' });
  assert.equal(await desktop.page.locator('#root').isVisible(), false);
  assert.equal(await desktop.page.locator('.qr-dialog').isVisible(), false);
  assert.equal(await desktop.page.locator('.qr-print-sheet.is-active').isVisible(), true);
  assert.ok(await desktop.page.locator('.qr-print-sheet.is-active h1').innerText());
  await desktop.page.pdf({ path: '.sites-runtime/qa/printed-qr.pdf', format: 'A4' });
  await desktop.page.emulateMedia({ media: 'screen' });
  await desktop.page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await desktop.page.locator('body').evaluate(node => node.classList.contains('sulyap-printing')), false);
  assert.equal(await desktop.page.locator('.qr-print-sheet.is-active').count(), 0);
  await desktop.context.close();
  console.log('PASS: desktop PNG download, prepared print image, QR-only print layout, and print cleanup from an open modal.');

  for (const userAgent of [android, ios]) {
    const { context, page } = await openPage({ userAgent });
    await context.addInitScript(() => {
      window.__shares = [];
      window.__shareError = '';
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files[0] instanceof File });
      Object.defineProperty(navigator, 'share', { configurable: true, value: ({ files }) => {
        window.__shares.push({ type: files[0].type, name: files[0].name, activation: navigator.userActivation.isActive });
        return window.__shareError ? Promise.reject(new DOMException('Share failed', window.__shareError)) : Promise.resolve();
      } });
      window.print = () => { window.__printCalled = true; };
    });
    await ready(page);
    await page.getByRole('button', { name: 'Download QR', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__shares.length), 1);
    assert.deepEqual(await page.evaluate(() => window.__shares[0].type), 'image/png');
    assert.equal(await page.evaluate(() => window.__shares[0].activation), true);
    assert.equal(await page.locator('.qr-save-preview, .qr-browser-help').count(), 0);
    await page.getByRole('button', { name: 'Print QR', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__shares.length), 2);
    assert.equal(await page.evaluate(() => window.__printCalled), undefined);
    assert.equal(await page.getByRole('heading', { name: 'Print your QR code', exact: true }).count(), 0);
    await page.evaluate(() => { window.__shareError = 'AbortError'; });
    await page.getByRole('button', { name: 'Download QR', exact: true }).click();
    assert.equal(await page.getByRole('alert').count(), 0, 'Cancelling the share sheet is not an error');
    await page.evaluate(() => { window.__shareError = 'NotAllowedError'; });
    await page.getByRole('button', { name: 'Download QR', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /Open this page in Chrome or Safari/);
    assert.equal(await page.getByRole('button', { name: 'Copy QR page link' }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await context.close();
  }
  console.log('PASS: Android/iOS Messenger save/print sharing works without extra preview or copy-link UI; cancellation stays silent and failures show a concise error.');

  const fallback = await openPage({ userAgent: android });
  await fallback.context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    window.print = () => { throw new Error('In-app printing should not be invoked'); };
  });
  let unwantedDownloads = 0;
  fallback.page.on('download', () => unwantedDownloads++);
  await ready(fallback.page, '/destination/5/qr');
  await fallback.page.getByRole('button', { name: 'Download QR', exact: true }).click();
  await fallback.page.getByRole('alert').waitFor();
  assert.match(await fallback.page.getByRole('alert').innerText(), /Saving is unavailable here/);
  assert.equal(await fallback.page.locator('.qr-save-preview, .qr-browser-help').count(), 0);
  assert.equal(await fallback.page.getByRole('textbox', { name: 'QR page link' }).count(), 0);
  await fallback.page.getByRole('button', { name: 'Print QR', exact: true }).click();
  assert.match(await fallback.page.getByRole('alert').innerText(), /Printing is unavailable here/);
  await fallback.page.screenshot({ path: '.sites-runtime/qa/messenger-qr-clean.png', fullPage: true });
  assert.equal(unwantedDownloads, 0, 'Do not rely on silently blocked in-app downloads');

  const external = await openPage();
  await ready(external.page, '/destination/5/qr');
  const externalDownload = external.page.waitForEvent('download');
  await external.page.getByRole('button', { name: 'Download QR', exact: true }).click();
  assert.match((await externalDownload).suggestedFilename(), /^sulyap-05-/);
  await external.page.goto(origin + '/destination/invalid/qr', { waitUntil: 'domcontentloaded' });
  await external.page.getByRole('link', { name: 'Explore Destinations', exact: true }).last().waitFor();
  assert.equal(await external.page.locator('.qr-card').count(), 0);
  await external.context.close();
  await fallback.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: unsupported save/print errors, direct QR page download, invalid destination, and no runtime errors.');
} finally {
  await browser.close();
}
