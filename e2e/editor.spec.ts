import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function revealPanel(page: import('@playwright/test').Page, mobile: boolean) { if (mobile) await page.getByRole('button', { name: 'Editar mapa', exact: true }).click(); }
test('preset SLEP → HEX → SVG editable → PNG con dimensiones exactas', async ({ page, isMobile }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click();
  await expect(page.locator('.map-svg path[role="button"]')).toHaveCount(30);
  await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(7);
  await revealPanel(page, isMobile);
  await expect(page.locator('.commune-row input:checked')).toHaveCount(7);
  await page.getByRole('button', { name: 'Diseño', exact: true }).click();
  const hex = page.getByRole('textbox', { name: 'HEX Comunas destacadas', exact: true });
  await hex.fill('#E45D47');
  await expect(page.locator('#preview-07401')).toHaveAttribute('fill', '#E45D47');
  await hex.fill('#ZZZZZZ'); await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#preview-07401')).toHaveAttribute('fill', '#E45D47'); await hex.fill('#E45D47');
  if (isMobile) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Exportar mapa' }).click();
  await page.getByLabel('Proporción', { exact: true }).selectOption('square');
  await expect(page.locator('.canvas-guide')).toContainText('1000 × 1000');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar SVG' }).click(); const svgDownload = await downloadPromise;
  const svg = await readFile((await svgDownload.path())!, 'utf8');
  expect(svgDownload.suggestedFilename()).toBe('sleplosalamos_maule_7comunas.svg');
  const result = await page.evaluate(text => { const xml = new DOMParser().parseFromString(text, 'image/svg+xml'); return { error: !!xml.querySelector('parsererror'), fill: xml.querySelector('#comuna-07401')?.getAttribute('fill'), viewBox: xml.documentElement.getAttribute('viewBox'), metadata: xml.querySelector('metadata')?.textContent, raster: xml.querySelectorAll('image,script').length }; }, svg);
  expect(result).toMatchObject({ error: false, fill: '#E45D47', viewBox: '0 0 1000 1000', raster: 0 }); expect(result.metadata).toContain('Biblioteca del Congreso');
  if (!isMobile) await svgDownload.saveAs('docs/examples/sleplosalamos-maule.svg');
  await page.getByLabel('Resolución PNG').selectOption('2');
  const pngPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar PNG' }).click(); const pngDownload = await pngPromise;
  const png = await readFile((await pngDownload.path())!); expect(png.subarray(1, 4).toString()).toBe('PNG'); expect(png.readUInt32BE(16)).toBe(2000); expect(png.readUInt32BE(20)).toBe(2000);
  if (!isMobile) await pngDownload.saveAs('docs/examples/sleplosalamos-maule.png');
  const cornerAlpha = await page.evaluate(async data => { const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, 1, 1).data[3]; }, png.toString('base64')); expect(cornerAlpha).toBe(0);
  expect(errors).toEqual([]);
});

test('carga las 16 regiones y Chile sin perder la selección ni las islas', async ({ page, isMobile }) => {
  test.setTimeout(180000);
  await page.goto('/'); await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click();
  await expect(page.locator('.map-svg path[role="button"]')).toHaveCount(30);
  await revealPanel(page, isMobile);
  const regions = [{ code: '15', n: 4 }, { code: '01', n: 7 }, { code: '02', n: 9 }, { code: '03', n: 9 }, { code: '04', n: 15 }, { code: '05', n: 38 }, { code: '13', n: 52 }, { code: '06', n: 33 }, { code: '07', n: 30 }, { code: '16', n: 21 }, { code: '08', n: 33 }, { code: '09', n: 32 }, { code: '14', n: 12 }, { code: '10', n: 30 }, { code: '11', n: 10 }, { code: '12', n: 10 }];
  for (const region of regions) { await page.getByLabel('Región', { exact: true }).selectOption(region.code); await expect(page.locator('.map-svg path[role="button"]').first()).toHaveAttribute('data-cut', new RegExp(`^${region.code}`), { timeout: 30000 }); await expect(page.locator('.map-svg path[role="button"]')).toHaveCount(region.n, { timeout: 30000 }); await expect(page.locator('.selection-summary strong')).toHaveText('7'); }
  await page.getByLabel('Región', { exact: true }).selectOption(''); await expect(page.locator('.map-svg path[role="button"]')).toHaveCount(345, { timeout: 45000 });
  await expect(page.locator('#preview-05201')).toHaveAttribute('d', /M/); await expect(page.locator('#preview-05104')).toHaveAttribute('d', /M/);
  await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(7);
});

test('persistencia, búsqueda sin tildes, selección, oscuro y accesibilidad', async ({ page, isMobile }, info) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click();
  await expect(page.locator('#preview-07401')).toBeVisible();
  await revealPanel(page, isMobile); await page.getByRole('textbox', { name: 'Buscar comuna o CUT' }).fill('colbun');
  await expect(page.locator('.commune-row')).toHaveCount(1); await page.locator('.commune-row input').uncheck();
  await page.reload(); await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(6);
  await page.getByLabel('Tema de la interfaz').selectOption('dark'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  if (isMobile) await revealPanel(page, true);
  const dark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(dark.violations).toEqual([]);
  if (isMobile) await page.keyboard.press('Escape');
  await page.screenshot({ path: `docs/screenshots/${info.project.name}-dark.png`, fullPage: true });
  await page.getByLabel('Tema de la interfaz').selectOption('light');
  if (isMobile) await revealPanel(page, true);
  const light = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(light.violations).toEqual([]);
  if (isMobile) await page.keyboard.press('Escape');
  await page.screenshot({ path: `docs/screenshots/${info.project.name}-light.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
});

test('silueta real, selección por teclado y exportación independiente del zoom', async ({ page, isMobile }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click(); await expect(page.locator('#preview-07401')).toBeVisible();
  await page.locator('#preview-07401').focus(); await page.keyboard.press('Space'); await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(6);
  await expect(page.locator('#preview-07401')).toBeFocused();
  await page.getByRole('button', { name: 'Silueta', exact: true }).click(); await expect(page.locator('.map-svg path[role="button"]')).toHaveCount(6);
  await page.getByRole('button', { name: 'Acercar mapa', exact: true }).click();
  if (isMobile) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Exportar mapa' }).click();
  const promise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar SVG' }).click(); const download = await promise;
  const svg = await readFile((await download.path())!, 'utf8'); expect(svg).toContain('id="silueta-territorial"'); expect(svg).not.toContain('id="comuna-'); expect(svg).not.toContain('scale(');
});

test('grupos, paletas personales y proyecto JSON se guardan y reutilizan', async ({ page, isMobile }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Preset SLEP Los Álamos' }).click(); await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(7);
  await revealPanel(page, isMobile); await page.getByRole('button', { name: 'Grupos', exact: true }).click();
  await page.getByLabel('Nombre del nuevo grupo').fill('Equipo azul'); await page.getByRole('textbox', { name: 'HEX Color del nuevo grupo', exact: true }).fill('#123456');
  await page.getByRole('button', { name: 'Crear grupo' }).click(); await page.getByRole('button', { name: 'Asignar selección a este grupo' }).click(); await expect(page.locator('#preview-07401')).toHaveAttribute('fill', '#123456');
  await page.getByRole('button', { name: 'Diseño', exact: true }).click(); await page.getByRole('textbox', { name: 'HEX Comunas destacadas', exact: true }).fill('#E45D47');
  await page.getByText('Mis paletas', { exact: true }).click(); await page.getByLabel('Nombre de paleta').fill('Paleta equipo'); await page.getByRole('button', { name: 'Guardar paleta', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicar', exact: true }).click(); await page.getByLabel('Nombre de paleta').fill('Paleta copia'); await page.getByRole('button', { name: 'Guardar / renombrar', exact: true }).click(); await page.getByRole('button', { name: 'Eliminar paleta', exact: true }).click();
  const palettePromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click(); const paletteDownload = await palettePromise;
  const palettes = JSON.parse(await readFile((await paletteDownload.path())!, 'utf8')); expect(palettes.palettes).toHaveLength(1); expect(palettes.palettes[0].name).toBe('Paleta equipo');
  await page.getByRole('button', { name: 'Proyecto', exact: true }).click(); await page.getByLabel('Nombre del preset').fill('Mapa equipo'); await page.getByRole('button', { name: 'Guardar configuración actual' }).click();
  const jsonPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar proyecto', exact: true }).click(); const jsonDownload = await jsonPromise; const json = await readFile((await jsonDownload.path())!, 'utf8');
  expect(JSON.parse(json).groups[0].cuts).toHaveLength(7);
  await page.getByRole('button', { name: 'Territorio', exact: true }).click(); await page.getByRole('button', { name: 'Limpiar', exact: true }).click(); await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Proyecto', exact: true }).click(); await page.locator('#editor-panel input[type="file"]').setInputFiles({ name: 'proyecto.json', mimeType: 'application/json', buffer: Buffer.from(json) }); await expect(page.locator('.map-svg [data-selected="true"]')).toHaveCount(7);
  await page.reload(); await expect(page.locator('#preview-07401')).toHaveAttribute('fill', '#123456'); await revealPanel(page, isMobile); await page.getByRole('button', { name: 'Proyecto', exact: true }).click(); await expect(page.getByRole('button', { name: 'Mapa equipo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diseño', exact: true }).click(); await page.getByText('Mis paletas', { exact: true }).click(); await expect(page.locator('option').filter({ hasText: 'Paleta equipo' })).toHaveCount(1);
});
