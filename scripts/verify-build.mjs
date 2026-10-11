import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://127.0.0.1:4173/GeoSVG/';
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  const dataRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (request.url().includes('/data/')) dataRequests.push(request.url()); });
  await page.goto(url);
  await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click();
  await page.locator('.map-svg [data-cut="07401"]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.map-svg [data-selected="true"]').length === 7);
  assert.equal(await page.locator('.map-svg [data-selected="true"]').count(), 7);
  assert.equal(await page.locator('.map-svg path[role="button"]').count(), 30);
  assert(dataRequests.some(u => u.endsWith('/GeoSVG/data/regions/07.topo.json')));
  assert(!dataRequests.some(u => u.endsWith('/chile.topo.json')), 'La carga regional no debe descargar el país.');
  assert.deepEqual(errors, []);
  console.log('Build bajo /GeoSVG/ válido: assets, Worker, cartografía regional y preset. Sin carga nacional inicial ni errores HTTP/JavaScript.');
} finally { await browser.close(); }
