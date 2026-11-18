// Novidades para você igual ao Android: filmes mais novos do catálogo inteiro
// (added), séries só para completar, sem adultos, ordem estável.
const assert = require('node:assert/strict');
global.window = global;
global.EP = {};
require('../src/core/ns.js');
require('../src/services/playlistRules.js');
require('../src/services/catalogService.js');
const C = EP.CatalogService;
const xt = { host: 'http://srv', username: 'u', password: 'p', liveExtension: 'ts' };
const movieCats = [{ id: '1', name: 'Ação' }, { id: '2', name: 'Lançamentos' }, { id: '9', name: 'XXX Adultos' }];
const seriesCats = [{ id: '5', name: 'Séries' }];

function movie(id, added, cat) { return { stream_id: id, name: 'Filme ' + id, added: String(added), category_id: cat || '1', container_extension: 'mp4' }; }
async function run(movies, series) {
  const raws = { movies: JSON.stringify(movies), series: JSON.stringify(series || []) };
  let seriesFetched = 0;
  C.rawList = (x, kind) => { if (kind === 'series') seriesFetched++; return Promise.resolve(raws[kind]); };
  const result = await C.recentTitles(xt, movieCats, seriesCats);
  return { result, seriesFetched };
}

(async () => {
  // Catálogo grande: os 60 mais novos de qualquer categoria, sem adultos, sem séries.
  const big = [];
  for (let i = 1; i <= 500; i++) big.push(movie(i, 1700000000 + i * (i % 7 === 0 ? 10 : 1), i % 2 ? '1' : '2'));
  big.push(movie(9999, 1900000000, '9')); // adulto mais novo de todos: fica de fora
  let { result, seriesFetched } = await run(big);
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 60);
  assert.equal(seriesFetched, 0, 'com 60+ filmes não baixa séries');
  const adds = result.items.map((it) => Date.parse(it.added_at));
  for (let i = 1; i < adds.length; i++) assert.ok(adds[i - 1] >= adds[i], 'mais novo primeiro');
  assert.ok(!result.items.some((it) => it.id === 'movie:9999'), 'sem adultos');
  assert.equal(result.items[0].id, 'movie:497', 'o mais novo do catálogo inteiro');
  assert.equal(result.items[0].category, 'Ação');

  // Sem data: mantém a ordem do servidor (topItems estável).
  ({ result } = await run([{ stream_id: 3, name: 'C' }, { stream_id: 1, name: 'A' }, { stream_id: 2, name: 'B' }], []));
  assert.deepEqual(result.items.map((it) => it.id), ['movie:3', 'movie:1', 'movie:2']);

  // Poucos filmes: completa com séries na ordem do servidor.
  const series = [{ series_id: 7, name: 'S7', category_id: '5', last_modified: '1800000000' }, { series_id: 8, name: 'S8', category_id: '5' }];
  ({ result, seriesFetched } = await run([movie(1, 1700000001), movie(2, 1700000002)], series));
  assert.equal(seriesFetched, 1);
  assert.deepEqual(result.items.map((it) => it.id), ['movie:2', 'movie:1', 'series:7', 'series:8']);

  // Falha ao baixar: ok=false (a Início fica com a semente).
  C.rawList = () => Promise.resolve(null);
  assert.equal((await C.recentTitles(xt, movieCats, seriesCats)).ok, false);
  console.log('recent-titles.test.cjs: ok');
})().catch((e) => { console.error(e); process.exit(1); });
