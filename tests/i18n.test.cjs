/* Idioma: dicionário e modelos com partes variáveis. */
const assert = require('assert');
const store = { 'elvanoq-lg:language': 'en' };
global.window = { EP: {}, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } }, sessionStorage: null };
global.navigator = { language: 'pt-BR' };
global.EP = window.EP;
require('../src/core/storage.js');
require('../src/core/i18n-en.js');
require('../src/core/i18n.js');
const EP = window.EP;
assert.strictEqual(EP.I18n.language(), 'en');
assert.strictEqual(EP.tr('Sair da conta'), 'Sign out');
assert.strictEqual(EP.tr('Código desta TV: LG-123'), "This TV's code: LG-123");
assert.strictEqual(EP.tr('PIN incorreto. Restam 3 tentativas.'), 'Incorrect PIN. 3 attempts left.');
assert.strictEqual(EP.tr('Matrix'), 'Matrix');
assert.strictEqual(EP.I18n.clockDate(new Date(2026, 10, 16)), 'Monday, Nov 16');
console.log('i18n ok');
