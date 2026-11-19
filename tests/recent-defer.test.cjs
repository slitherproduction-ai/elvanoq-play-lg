// 1.2.2: a lista completa de filmes (Novidades) não é baixada durante o vídeo
// nem a cada abertura: lista guardada vale 12 h; download só com a TV parada
// fora do player e da TV ao Vivo.
const assert = require('node:assert/strict');
const store = {};
global.window = global;
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = { visibilityState: 'visible', addEventListener() {} };
const timers = [];
global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
global.clearTimeout = () => {};
global.EP = { Stage: {} };
require('../src/core/ns.js');
let downloads = 0;
EP.CatalogService = { recentTitles: () => { downloads++; return Promise.resolve({ ok: true, items: [{ id: 'movie:1' }] }); } };
EP.Emitter = function () { this.on = () => {}; this.emit = () => {}; };
// Só o método em teste: carregamos o arquivo e usamos o protótipo.
try { require('../src/views/appShell.js'); } catch (_) {}
const proto = EP.AppShell && EP.AppShell.prototype;
assert.ok(proto && proto.loadRecentTitles, 'AppShell.loadRecentTitles existe');
function shell(selected, playing) {
  return Object.assign(Object.create(proto), {
    lazy: true, xtream: { host: 'http://s', username: 'u' }, catalogVersion: 1, selectedIndex: selected,
    playerView: { isVisible: () => playing.value }, views: [{ setRecentTitles() {} }],
    filterVisible: (x) => x, movieCategories: [], seriesCategories: []
  });
}
(async () => {
  const playing = { value: true };
  const s = shell(0, playing);
  s.loadRecentTitles();
  assert.equal(downloads, 0, 'não baixa na hora');
  timers.shift().fn();                       // 20 s depois, vídeo aberto
  assert.equal(downloads, 0, 'com o player aberto, espera');
  playing.value = false;
  timers.shift().fn();                       // parado fora do player
  assert.equal(downloads, 1);
  await new Promise((r) => setImmediate(r));
  const saved = JSON.parse(store['elvanoq.recentTitles.http://s|u']);
  assert.ok(saved.at > 0 && saved.items.length === 1, 'guarda com a data');
  // Nova abertura dentro de 12 h: usa a guardada, sem download.
  const again = shell(0, playing); timers.length = 0;
  again.loadRecentTitles();
  assert.equal(again.recentTitles.length, 1);
  assert.equal(timers.length, 0, 'lista recente: nada agendado');
  console.log('recent-defer.test.cjs: ok');
})().catch((e) => { console.error(e); process.exit(1); });
