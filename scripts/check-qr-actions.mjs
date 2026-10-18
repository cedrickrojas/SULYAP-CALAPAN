import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';

const origin = process.argv.find(arg => /^https?:\/\//.test(arg)) || 'http://127.0.0.1:5173';
const useWebKit = process.argv.includes('--webkit');
const qa = `.sites-runtime/qa/${useWebKit ? 'webkit' : 'chromium'}`;
mkdirSync(qa, { recursive: true });
const browser = await (useWebKit ? webkit : chromium).launch({ headless: true, ...(!useWebKit && { channel: 'chromium' }) });
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

async function assertLogo(page, selector) {
  const pinkPixels = await page.locator(selector).evaluate(async image => {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1000;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 1000, 1000);
    const { data } = context.getImageData(400, 400, 200, 200);
    let pink = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1] + 30 && data[i + 2] > data[i + 1] + 10) pink++;
    }
    return pink;
  });
  assert.ok(pinkPixels > 200, 'The QR PNG must contain its pink center logo');
}

async function assertPng(page, bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), 1000);
  assert.equal(bytes.readUInt32BE(20), 1000);
  await page.evaluate(bytes => {
    const image = document.createElement('img');
    image.id = 'downloaded-qr-check';
    image.src = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    document.body.appendChild(image);
  }, [...bytes]);
  await assertLogo(page, '#downloaded-qr-check');
  await page.locator('#downloaded-qr-check').evaluate(image => {
    URL.revokeObjectURL(image.src);
    image.remove();
  });
}

async function downloadQr(page, id, path) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download QR', exact: true }).click();
  const download = await pending;
  assert.equal(download.url(), `${origin}/api/qr-download?id=${id}`);
  assert.match(download.suggestedFilename(), new RegExp(`^sulyap-${String(id).padStart(2, '0')}-.+-qr\\.png$`));
  await download.saveAs(path);
  await assertPng(page, readFileSync(path));
  assert.equal(await page.locator('.qr-save-help, .qr-save-preview, .qr-browser-help').count(), 0);
  assert.equal(await page.getByRole('link', { name: /Open in Chrome|Open in browser/ }).count(), 0);
}

try {
  const desktop = await openPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.page.goto(origin + '/destinations', { waitUntil: 'domcontentloaded' });
  await desktop.page.getByRole('button', { name: /^View QR code for / }).first().click();
  await desktop.page.waitForFunction(() => !document.querySelector('.qr-tools button').disabled);
  await downloadQr(desktop.page, 1, `${qa}/downloaded-qr.png`);
  await assertLogo(desktop.page, '.qr-image');
  assert.equal(await desktop.page.locator('.qr-image').getAttribute('src'), await desktop.page.locator('.qr-print-sheet img').getAttribute('src'));
  for (let id = 1; id <= 10; id++) {
    const response = await desktop.context.request.get(`${origin}/api/qr-download?id=${id}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /^image\/png/);
    assert.match(response.headers()['content-disposition'], /^attachment; filename="sulyap-/);
    const bytes = await response.body();
    await assertPng(desktop.page, bytes);
    writeFileSync(`${qa}/qr-${id}.png`, bytes);
  }
  assert.equal((await desktop.context.request.get(`${origin}/api/qr-download?id=invalid`)).status(), 404);
  assert.equal((await desktop.context.request.post(`${origin}/api/qr-download?id=1`)).status(), 405);
  const head = await desktop.context.request.head(`${origin}/api/qr-download?id=1`);
  assert.equal(head.status(), 200);
  assert.match(head.headers()['content-disposition'], /^attachment;/);
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
  if (!useWebKit) await desktop.page.pdf({ path: `${qa}/printed-qr.pdf`, format: 'A4' });
  await desktop.page.emulateMedia({ media: 'screen' });
  await desktop.page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await desktop.page.locator('.qr-print-sheet.is-active').waitFor({ state: 'detached' });
  await desktop.context.close();
  console.log('PASS: real HTTP PNG attachments for all ten destinations retain the logo; invalid requests and desktop printing work.');

  for (const [platform, userAgent] of [['android', android], ['ios', ios]]) {
    for (const sharing of [true, false]) {
      const { context, page } = await openPage({ userAgent });
      await context.addInitScript(sharing => {
        window.__shares = [];
        window.__shareError = '';
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => sharing });
        Object.defineProperty(navigator, 'share', { configurable: true, value: sharing ? ({ files }) => {
          window.__shares.push({ type: files[0].type, activation: navigator.userActivation.isActive });
          return window.__shareError ? Promise.reject(new DOMException('Share failed', window.__shareError)) : Promise.resolve();
        } : undefined });
        // Even without honoring the HTML download attribute, the HTTP header must download.
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          this.removeAttribute('download');
          return click.call(this);
        };
        window.print = () => { throw new Error('In-app window.print must not be used'); };
      }, sharing);
      await ready(page);
      await downloadQr(page, 1, `${qa}/${platform}-${sharing ? 'share' : 'no-share'}.png`);
      assert.equal(await page.evaluate(() => window.__shares.length), 0, 'Download QR must never open the share sheet');
      assert.equal(await page.getByRole('alert').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (sharing) {
        await page.getByRole('button', { name: 'Print QR', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => window.__shares[0]), { type: 'image/png', activation: true });
        await page.evaluate(() => { window.__shareError = 'AbortError'; });
        await page.getByRole('button', { name: 'Print QR', exact: true }).click();
        assert.equal(await page.getByRole('alert').count(), 0);
        await page.evaluate(() => { window.__shareError = 'NotAllowedError'; });
        await page.getByRole('button', { name: 'Print QR', exact: true }).click();
        await page.getByRole('alert').waitFor();
      } else {
        await page.getByRole('button', { name: 'Print QR', exact: true }).click();
        await page.getByRole('alert').waitFor();
      }
      // Download remains direct after a print error and clears that error.
      await downloadQr(page, 1, `${qa}/${platform}-after-print.png`);
      assert.equal(await page.getByRole('alert').count(), 0);
      await context.close();
    }
  }
  console.log('PASS: Android/iOS browser simulations download the HTTP PNG with or without sharing support and without long-press or browser-opening UI.');

  const retry = await openPage();
  await retry.page.route('**/branding/sulyap-logo.jpg', route => route.abort());
  await retry.page.goto(origin + '/destination/5/qr', { waitUntil: 'domcontentloaded' });
  await retry.page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  await retry.page.unroute('**/branding/sulyap-logo.jpg');
  await retry.page.getByRole('button', { name: 'Try again', exact: true }).click();
  await retry.page.waitForFunction(() => !document.querySelector('.qr-tools button').disabled);
  await downloadQr(retry.page, 5, `${qa}/retried-qr.png`);
  await retry.page.goto(origin + '/destination/invalid/qr');
  assert.equal(await retry.page.locator('.qr-card').count(), 0);
  await retry.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: preparation retry and invalid destination handling; no browser runtime errors.');
} finally {
  await browser.close();
}
