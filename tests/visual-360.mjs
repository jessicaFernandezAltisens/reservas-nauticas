// Prueba de diseño a 360 px con un navegador real (Chromium vía Playwright).
//
// Uso:
//   npm i -D playwright && npx playwright install chromium   (una sola vez)
//   npm run build && npm run preview                          (en otra terminal; sirve en http://localhost:4173)
//   npm run test:360                                          (o BASE_URL=https://… npm run test:360)
//
// Recorre la app haciendo clic como una persona y comprueba en cada pantalla:
// - que nada se salga del ancho (sin desplazamiento horizontal),
// - que botones y campos midan al menos 44 px de alto y los campos usen letra de 16 px o más,
// - que en Inicio el primer «Reservar salida» se vea sin hacer scroll en 360 × 640.
// Guarda capturas en tests/capturas-360/.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const DIR = new URL('./capturas-360/', import.meta.url);
fs.mkdirSync(DIR, { recursive: true });

const fallos = [];
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) fallos.push(msg);
};

async function revisar(p, nombre) {
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => {
    const visibles = (sel) =>
      [...document.querySelectorAll(sel)].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      });
    return {
      ancho: document.documentElement.scrollWidth,
      botonesBajos: visibles('.btn-primario, .btn-secundario, .campo')
        .filter((e) => e.getBoundingClientRect().height < 43.5)
        .map((e) => e.textContent.trim().slice(0, 30) || e.tagName),
      letraChica: visibles('input.campo, select.campo, textarea.campo')
        .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16)
        .map((e) => e.name || e.type),
    };
  });
  ok(r.ancho <= 360, `${nombre}: sin desplazamiento horizontal (ancho ${r.ancho}px)`);
  ok(r.botonesBajos.length === 0, `${nombre}: botones y campos de 44 px o más ${r.botonesBajos.length ? JSON.stringify(r.botonesBajos) : ''}`);
  ok(r.letraChica.length === 0, `${nombre}: campos con letra de 16 px o más ${r.letraChica.length ? JSON.stringify(r.letraChica) : ''}`);
  await p.screenshot({ path: new URL(`${nombre}.png`, DIR).pathname, fullPage: true });
}

async function irA(p, texto) {
  const menu = p.getByRole('button', { name: 'Abrir menú' });
  if (await menu.isVisible()) await menu.click();
  await p.getByRole('link', { name: texto, exact: true }).first().click();
}

const navegador = await chromium.launch();
const p = await navegador.newPage({ viewport: { width: 360, height: 640 } });
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));

// Datos de ejemplo limpios
await p.goto(BASE);
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('marea-alta:')).forEach((k) => localStorage.removeItem(k)));
await p.reload();

// Inicio
const primero = p.getByRole('link', { name: /Reservar salida/ }).first();
await primero.waitFor();
const caja = await primero.boundingBox();
ok(caja && caja.y + caja.height <= 640, `Inicio: primer «Reservar salida» visible sin scroll (termina a ${Math.round(caja.y + caja.height)}px de 640)`);
await revisar(p, '1-inicio');

// Reservar: paseo corto con adultos y niños
await primero.click();
await p.locator('section', { hasText: 'Fecha' }).getByRole('button').first().click();
await p.locator('section', { hasText: 'Zarpe' }).locator('button:not([disabled])').first().click();
await p.getByRole('button', { name: 'Sumar Adultos' }).click();
await p.getByRole('button', { name: 'Sumar Niños de 2 a 10 años' }).click();
await p.locator('input[autocomplete="name"]').fill('Prueba 360');
await p.locator('input[type="tel"]').fill('099 123 456');
await revisar(p, '2-reservar');

// Confirmación
await p.getByRole('button', { name: 'Confirmar reserva' }).click();
await p.getByText('¡Reserva confirmada!').waitFor();
await revisar(p, '3-confirmacion');

// Mi reserva: buscar y cancelar (más de 24 h)
await irA(p, 'Mi reserva');
await p.locator('input.font-mono').fill('MA-DEMO10');
await p.locator('input[type="tel"]').fill('099433677');
await p.getByRole('button', { name: 'Buscar' }).click();
await p.getByRole('button', { name: 'Cancelar reserva' }).click();
await p.getByRole('alertdialog').getByRole('button', { name: 'Sí, continuar' }).click();
ok(await p.getByText(/Se liberaron 2 lugares/).isVisible(), 'Mi reserva: cancelación desde el diálogo propio');
await revisar(p, '4-mi-reserva');

// Admin
await irA(p, 'Admin');
await p.locator('input[type="password"]').fill('marea2026');
await p.getByRole('button', { name: 'Entrar' }).click();
await p.getByRole('heading', { name: 'Administración' }).waitFor();
await revisar(p, '5-admin');

ok(errores.length === 0, `sin errores de JavaScript ${errores.length ? JSON.stringify(errores) : ''}`);
await navegador.close();

console.log(fallos.length ? `\n${fallos.length} comprobación(es) fallaron.` : '\nTodo bien a 360 px.');
process.exit(fallos.length ? 1 : 0);
