import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const errors = [];
const requireFile = (relativePath) => {
  const filePath = resolve(root, relativePath);
  if (!existsSync(filePath)) errors.push('Arquivo obrigatório ausente: ' + relativePath);
  else if (statSync(filePath).size === 0) errors.push('Arquivo vazio: ' + relativePath);
  return filePath;
};

// Manifesto
const manifestPath = resolve(root, 'appinfo.json');
let manifest = null;
if (!existsSync(manifestPath)) errors.push('appinfo.json não encontrado.');
else {
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (error) { errors.push('appinfo.json inválido: ' + error.message); }
}
if (manifest) {
  for (const field of ['id', 'version', 'type', 'main', 'title', 'icon', 'largeIcon', 'iconColor', 'splashBackground']) {
    if (!manifest[field]) errors.push('Campo obrigatório ausente no appinfo.json: ' + field);
  }
  if (manifest.type && manifest.type !== 'web') errors.push('appinfo.json.type deve ser "web".');
  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push('appinfo.json.version deve usar major.minor.patch.');
  for (const field of ['main', 'icon', 'largeIcon', 'splashBackground']) if (manifest[field]) requireFile(manifest[field]);
}

// Todos os scripts e estilos referenciados pelo index.html precisam existir e compilar.
const html = existsSync(resolve(root, 'index.html')) ? readFileSync(resolve(root, 'index.html'), 'utf8') : '';
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]);
if (!scripts.length) errors.push('index.html não referencia nenhum script.');
// Tamanhos exigidos pelo webOS: ícone 80x80, ícone grande 130x130, splash 1920x1080 (PNG).
const pngSize = (file) => { const p = file && requireFile(file); if (!p || !existsSync(p)) return null; const b = readFileSync(p); return b.toString('ascii', 1, 4) === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
for (const [field, w, h] of [['icon', 80, 80], ['largeIcon', 130, 130], ['splashBackground', 1920, 1080]]) {
  const size = pngSize(manifest[field]);
  if (!size || size[0] !== w || size[1] !== h) errors.push(`${field} deve ser PNG ${w}x${h}`);
}
for (const style of styles) requireFile(style);
for (const script of scripts) {
  const scriptPath = requireFile(script);
  if (!existsSync(scriptPath)) continue;
  const result = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(script + ' contém erro de sintaxe: ' + result.stderr.trim());
  // Compatibilidade com webOS antigos: sem sintaxe ES2015+ nas fontes do app.
  const source = readFileSync(scriptPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/=>|`|\b(let|const|class)\s|\basync\s+function|\bawait\s/.test(source)) errors.push(script + ' usa sintaxe ES2015+ (use ES5 + Promise).');
}

// Imagens usadas pelo layout Roku
for (const asset of ['images/elvanoq-wordmark-white.png', 'images/elvanoq-login-tv-backdrop.jpg', 'images/splash.jpg', 'fonts/Inter-Regular.woff', 'fonts/Inter-Medium.woff', 'fonts/Inter-SemiBold.woff', 'fonts/Inter-Bold.woff']) requireFile(asset);

// Testes de regras
for (const test of ['tests/playlist-sync.test.cjs', 'tests/epg-and-stream.test.cjs']) {
  const result = spawnSync(process.execPath, [resolve(root, test)], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(test + ' falhou:\n' + (result.stderr || result.stdout).trim());
}

if (errors.length) { console.error('Validação webOS falhou:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Validação webOS concluída com sucesso (' + scripts.length + ' scripts).');
