const assert = require('node:assert/strict');
let clock = 1000000;
const timers = [];
const store = {};
global.window = global;
global.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } };
global.setInterval = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
global.document = { hidden: false, addEventListener() {} };
global.EP = {
  VERSION: 'test',
  formatNumber: n => String(n),
  Registry: {
    writeJson: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    readJson: (k, d) => (k in store ? store[k] : d),
    remove: k => { delete store[k]; }
  }
};
require('../src/core/perfMonitor.js');
const Perf = EP.Perf;
Perf.start();

// Pausa mostrada é o tempo inteiro sem resposta (≥ 0,4 s), não o excedente.
const tick = timers.find(t => t.ms === 250);
clock += 250; tick.fn();
clock += 600; tick.fn();
let s = Perf.summary();
assert.equal(s.pauses, '1 (total 0,6 s)');
assert.ok(s.maxPause.startsWith('0,6 s'));

// Carga do catálogo continua na tela depois de abrir muitas categorias.
Perf.recordSync('catalog', clock - 5800, 131);
for (let i = 0; i < 10; i++) { clock += 1000; Perf.recordSync('category', clock - 1900, 763); }
s = Perf.summary();
assert.equal(s.catalog, '5,8 s • 131 categorias');
assert.equal(s.category, '1,9 s • 763 títulos');

// Limpar histórico zera tudo.
Perf.clear();
s = Perf.summary();
assert.equal(s.catalog, 'Ainda não medido');
assert.equal(s.pauses, 'Nenhuma');
console.log('Desempenho: catálogo mantido após 10 categorias, pausa medida inteira, limpar histórico passed');
