import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = resolve(root, 'appinfo.json');
const errors = [];
function requireFile(relativePath) { const filePath = resolve(root, relativePath); if (!existsSync(filePath)) errors.push('Arquivo obrigatório ausente: ' + relativePath); return filePath; }
if (!existsSync(manifestPath)) errors.push('appinfo.json não encontrado.');
else { let manifest; try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (error) { errors.push('appinfo.json inválido: ' + error.message); } if (manifest) { for (const field of ['id', 'version', 'type', 'main', 'title', 'icon', 'largeIcon', 'iconColor', 'splashBackground']) { if (!manifest[field]) errors.push('Campo obrigatório ausente no appinfo.json: ' + field); } if (manifest.type && manifest.type !== 'web') errors.push('appinfo.json.type deve ser "web".'); if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push('appinfo.json.version deve usar major.minor.patch.'); if (manifest.main) requireFile(manifest.main); if (manifest.icon) requireFile(manifest.icon); if (manifest.largeIcon) requireFile(manifest.largeIcon); if (manifest.splashBackground) requireFile(manifest.splashBackground); } }
for (const scriptName of ['app.js']) { const scriptPath = requireFile(scriptName); if (existsSync(scriptPath)) { const result = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' }); if (result.status !== 0) errors.push(scriptName + ' contém erro de sintaxe: ' + result.stderr.trim()); } }
for (const icon of ['icon.png', 'largeIcon.png']) { const iconPath = resolve(root, icon); if (existsSync(iconPath) && statSync(iconPath).size === 0) errors.push(icon + ' está vazio.'); }
if (errors.length) { console.error('Validação webOS falhou:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Validação webOS concluída com sucesso.');
