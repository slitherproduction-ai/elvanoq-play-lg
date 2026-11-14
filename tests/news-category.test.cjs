// Novidades para você: a semente usa a categoria de lançamentos do servidor.
const assert = require('node:assert/strict');
global.window = global;
global.EP = { Registry: { readJson: (k, d) => d, writeJson() {}, remove() {} } };
require('../src/services/catalogService.js');
const pick = EP.CatalogService.newsCategory;
const cats = names => names.map((name, i) => ({ id: String(i + 1), name }));

assert.equal(pick(cats(['Ação', 'LANÇAMENTOS 2026', 'Novidades'])).name, 'LANÇAMENTOS 2026');
assert.equal(pick(cats(['Drama', 'Filmes | Adicionados recentemente'])).name, 'Filmes | Adicionados recentemente');
assert.equal(pick(cats(['Adultos +18 Lançamentos', 'Comédia', 'Novidades'])).name, 'Novidades');
assert.equal(pick(cats(['XXX Lancamentos', 'Comédia'])).name, 'Comédia');
assert.equal(pick(cats(['XXX'])).name, 'XXX');
assert.equal(pick(cats(['Ação', 'Comédia'])).name, 'Ação');
console.log('news-category ok');
