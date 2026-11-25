/**
 * Ejecutor de pruebas e2e por tandas: un archivo a la vez, con pausas para el proveedor de IA y con limpieza entre archivos.
 *
 *   npm run e2e:tandas                      # todos los archivos
 *   npm run e2e:tandas -- ai-pantalla lifecycle   # solo esos (con o sin «.spec.js»)
 *
 * Por qué por tandas y no todo de una vez:
 *  - Memoria: un solo navegador a la vez; una corrida completa junta puede dejar sin memoria al equipo.
 *  - Proveedor de IA: el plan gratuito limita los tokens por minuto (429). Tras un archivo que usa el modelo se espera un minuto.
 *  - Datos: tras cada archivo se borran los datos de prueba que dejó (los marcados E2E-<sello>, ver el backend: scripts/e2e-cleanup.mjs).
 *  - Fallos: un archivo que falla se repite UNA vez tras esperar; si pasa en el reintento se marca «inestable» (no «roto»).
 *
 * Requisitos: backend con límites de pruebas (cd ../LogisticaSPABackend && npm run start:e2e) y el frontend (npm run dev).
 * El resumen queda en e2e-tandas.log. Variables: E2E_PAUSE_S (pausa tras un archivo con IA, por defecto 60).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAUSE_S = Number(process.env.E2E_PAUSE_S ?? 60);
const BACKEND = resolve('..', 'LogisticaSPABackend');
// archivos que NO llaman al modelo de IA (no necesitan pausa)
const NO_LLM = new Set(['lifecycle', 'navigation', 'ai-hey-logi', 'ai-voz-a11y', 'ai-voz-asistida', 'ai-voz-evento', 'ai-logi-avisos']);

const sleep = (s) => { if (s > 0) spawnSync(process.execPath, ['-e', `setTimeout(()=>{}, ${s * 1000})`]); };
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const wanted = process.argv.slice(2).map((a) => a.replace(/\.spec\.js$/, ''));
const all = readdirSync('e2e').filter((f) => f.endsWith('.spec.js')).map((f) => f.replace('.spec.js', '')).sort();
const files = wanted.length ? all.filter((f) => wanted.includes(f)) : all;
if (!files.length) { console.error('No hay archivos que coincidan.'); process.exit(2); }

/** Borra lo que dejó el archivo (si el backend está al lado y hay listas created*.json). */
const cleanup = () => {
  if (!existsSync(BACKEND) || !existsSync('e2e-results')) return;
  for (const f of readdirSync('e2e-results').filter((n) => /^created.*\.json$/.test(n))) {
    spawnSync(process.execPath, ['--env-file=.env', 'scripts/e2e-cleanup.mjs', resolve('e2e-results', f)], { cwd: BACKEND, stdio: 'ignore' });
  }
};

const run = (file, reuse) => {
  const r = spawnSync(npx, ['playwright', 'test', `e2e/${file}.spec.js`, '--reporter=line'], {
    encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, E2E_REUSE_AUTH: reuse ? '1' : '0' }, maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, ''); // sin los colores del terminal
  const count = (re) => Number(out.match(re)?.[1] ?? 0);
  const res = { passed: count(/(\d+) passed/), failed: count(/(\d+) failed/), skipped: count(/(\d+) skipped/), notRun: count(/(\d+) did not run/), flaky: count(/(\d+) flaky/), status: r.status };
  res.ok = r.status === 0 && res.failed === 0;
  res.error = out.split('\n').find((l) => /Error:|Timeout|429|ECONNREFUSED/.test(l))?.trim().slice(0, 160) ?? '';
  // el proceso terminó sin dar un resumen (se cortó, se quedó sin memoria o no pudo arrancar): se dice, no se muestra «0 ok» como si fuera un resultado
  if (!res.passed && !res.failed && !res.skipped && !res.notRun) {
    res.noResult = true;
    res.error = `sin resultado (código ${r.status ?? r.signal ?? r.error?.code ?? '?'})${res.error ? ` · ${res.error}` : ''}`;
  }
  return res;
};

const rows = [];
let first = true;
for (const file of files) {
  process.stdout.write(`▶ ${file} … `);
  let res = run(file, !first);
  first = false;
  let verdict = res.ok ? 'pasa' : 'FALLA';
  if (!res.ok) {
    cleanup();
    process.stdout.write('falló; espero y reintento … ');
    sleep(NO_LLM.has(file) ? 10 : 65);
    const retry = run(file, true);
    if (retry.ok) { verdict = 'inestable (pasó al reintentar)'; res = retry; } else { res = { ...retry, error: retry.error || res.error }; }
  }
  cleanup();
  rows.push({ file, verdict, ...res });
  console.log(`${verdict} — ${res.passed} ok, ${res.failed} fallan, ${res.notRun} sin correr, ${res.skipped} omitidas${res.error ? ` · ${res.error}` : ''}`);
  if (!NO_LLM.has(file) && file !== files[files.length - 1]) sleep(PAUSE_S);
}

const bad = rows.filter((r) => r.verdict === 'FALLA');
const flaky = rows.filter((r) => r.verdict.startsWith('inestable'));
const total = rows.reduce((n, r) => n + r.passed, 0);
const summary = [
  `Pruebas e2e por tandas — ${new Date().toLocaleString('es-BO')}`,
  ...rows.map((r) => `${r.verdict.padEnd(32)} ${r.file}  (${r.passed} ok, ${r.failed} fallan, ${r.notRun} sin correr${r.error ? `; ${r.error}` : ''})`),
  '',
  `${total} pruebas pasaron en ${rows.length} archivos · ${bad.length} archivos con fallos · ${flaky.length} inestables`,
].join('\n');
writeFileSync('e2e-tandas.log', `${summary}\n`);
console.log(`\n${summary}`);
process.exit(bad.length ? 1 : 0);
