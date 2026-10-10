import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {chromium, expect} from '@playwright/test';
import {establishments} from '../src/establishments.js';

const origin = process.argv[2] || 'http://127.0.0.1:5174';
const categories = [
  ['souvenirs', 'Souvenir Shops'], ['hotels', 'Hotels'], ['travel-agencies', 'Travel Agencies'],
];
assert.equal(establishments.length, 27, 'Keep the original twelve listings and add fifteen');
assert.equal(new Set(establishments.map(place => place.id)).size, 27);
for (const place of establishments) {
  assert.match(place.address, /Calapan City/);
  assert.equal(new URL(place.source).protocol, 'https:');
  if (place.phone) assert.match(place.telephone, /^\+63\d{9,10}$/);
}
const photos = JSON.parse(readFileSync('src/establishment-images.json', 'utf8'));
assert.equal(Object.keys(photos).length, establishments.length, 'Every establishment has a photo');
for (const place of establishments) assert.ok(photos[place.id], `Missing photo for ${place.name}`);
const credits = readFileSync('public/photo-credits.html', 'utf8');
for (const [id, photo] of Object.entries(photos)) {
  assert.ok(establishments.some(place => place.id === id), `Unknown photo: ${id}`);
  assert.ok(existsSync(`public${photo.src}`), `Missing photo: ${photo.src}`);
  assert.ok(credits.includes(`id="establishment-${id}"`), `Missing photo credit: ${id}`);
}
assert.ok(credits.includes('id="mindoro-culture"'), 'Retain home collage photo credits');
mkdirSync('.sites-runtime/qa', {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chromium'});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/establishments`);
  const cards = page.locator('.establishment-card');
  const filters = page.getByRole('group', {name: 'Filter establishments'});
  await expect(cards).toHaveCount(27);
  await expect(filters.getByRole('button')).toHaveCount(7);
  for (const [key, label] of categories) {
    assert.equal(establishments.filter(place => place.category === key).length, 5);
    const button = filters.getByRole('button', {name: new RegExp(`^${label}\\s*5$`)});
    await button.click();
    await expect(page).toHaveURL(`${origin}/establishments?type=${key}`);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(5);
    await expect(page.getByRole('status')).toHaveText('5 establishments');
    const expected = establishments.filter(place => place.category === key);
    assert.deepEqual(await cards.locator('h2').allTextContents(), expected.map(place => place.name));
    for (let index = 0; index < expected.length; index++) {
      const place = expected[index];
      const card = cards.nth(index);
      const map = new URL(await card.getByRole('link', {name: `Find ${place.name} on Google Maps`}).getAttribute('href'));
      assert.equal(map.searchParams.get('query'), `${place.name}, ${place.address}`);
      await expect(card.locator('.establishment-source')).toHaveAttribute('href', place.source);
      if (place.phone) await expect(card.locator('a[href^="tel:"]')).toHaveAttribute('href', `tel:${place.telephone}`);
      if (photos[place.id]) {
        await card.scrollIntoViewIfNeeded();
        await expect(card.locator('img')).toBeVisible();
        await card.locator('img').evaluate(image => image.decode());
        if (photos[place.id].illustrative) await expect(card.locator('.establishment-photo-type')).toContainText('Illustrative photo');
        if (photos[place.id].caption) await expect(card.locator('.establishment-photo-caption')).toHaveText(photos[place.id].caption);
        await expect(card.getByRole('link', {name: `Photo credit for ${place.name}`})).toHaveAttribute('href', `/photo-credits.html#establishment-${place.id}`);
      } else {
        await expect(card.locator('.establishment-photo-pending')).toHaveText('Photo coming soon');
      }
    }
    await page.reload();
    await expect(cards).toHaveCount(5);
    await expect(filters.getByRole('button', {name: new RegExp(`^${label}\\s*5$`)})).toHaveAttribute('aria-pressed', 'true');
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({path: `.sites-runtime/qa/establishments-${key}-desktop.png`});
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} overflows at ${width}px`);
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: `.sites-runtime/qa/establishments-${key}-mobile.png`, fullPage: true});
    await page.setViewportSize({width: 1440, height: 1000});
  }
  await filters.getByRole('button', {name: /^Hotels\s*5$/}).click();
  await filters.getByRole('button', {name: /^Souvenir Shops\s*5$/}).click();
  await page.goBack();
  await expect(page).toHaveURL(`${origin}/establishments?type=hotels`);
  await expect(cards).toHaveCount(5);
  await filters.getByRole('button', {name: /^All Establishments\s*27$/}).click();
  await expect(page).toHaveURL(`${origin}/establishments`);
  await expect(cards).toHaveCount(27);
  await expect(page.locator('.establishment-photo-pending')).toHaveCount(0);
  for (const image of await cards.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode());
  }
  await page.goto(`${origin}/establishments?type=unknown`);
  await expect(cards).toHaveCount(27);
  for (const [key, label] of categories) {
    await expect(page.locator('footer').getByRole('link', {name: label, exact: true})).toHaveAttribute('href', `/establishments?type=${key}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 27 Calapan listings; five souvenir shops, five hotels and five travel agencies; filter URLs/history, contacts/maps/sources, photos/credits, and 320–1440px layouts.');
} finally {
  await browser.close();
}
