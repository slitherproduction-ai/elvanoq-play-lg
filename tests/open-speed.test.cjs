// 1.1.7: abertura mais rápida — prévia vira tela cheia sem nova conexão e
// o Desempenho mede o tempo do clique até a imagem.
const assert = require('node:assert/strict');
global.window = global;
global.document = { visibilityState: 'visible', head: null };
global.EP = { Registry: { readJson: (k, d) => d, writeJson() {}, remove() {} }, formatNumber: String, VERSION: 't' };
require('../src/core/perfMonitor.js');
const Perf = EP.Perf;

// Desempenho: último, média e pior por tipo; falhas contadas à parte.
Perf.recordOpen('live', 2000, false);
Perf.recordOpen('live', 4000, true);
Perf.recordOpen('live', -1, false);
Perf.recordOpen('movies', 9000, false);
let s = Perf.summary();
assert.equal(s.openLive, 'Último 2,0 s • média 2,0 s • pior 2,0 s • 1 sem abrir');
assert.equal(s.openMovies, 'Último 9,0 s • média 9,0 s • pior 9,0 s');
assert.equal(s.openSeries, 'Ainda não medido');
assert.equal(s.openReused, '1 vez');
Perf.clear();
assert.equal(Perf.summary().openLive, 'Ainda não medido');

// Player: troca de <video> e eventos só do vídeo em uso.
function el() {
  const l = {};
  return { listeners: l, paused: true, readyState: 0, style: {}, className: '', parentNode: null,
    addEventListener(n, f) { (l[n] = l[n] || []).push(f); }, fire(n) { (l[n] || []).forEach(f => f({})); },
    play() { this.paused = false; return Promise.resolve(); } };
}
global.EP.Stage = { show() {}, setButton() {} };
global.EP.LiveFormat = { preferred: () => 'ts', remember() {}, formatOf: () => 'ts' };
require('../src/views/playerView.js');
const PV = EP.PlayerView.prototype;
const own = el(), preview = el();
const parent = { replaceChild(n, o) { n.parentNode = this; o.parentNode = null; } };
own.parentNode = parent;
let playing = 0;
const p = Object.assign(Object.create(PV), { video: own, onPlaying() { playing++; }, onPositionChanged() {}, refreshTrackStatus() {}, onFinished() {}, onLoadError() {}, showOsd() {}, hint: {}, controlLabels: [] });
p.bindVideo(own); own.epPlayerBound = true;
const old = p.swapVideo(preview);
assert.equal(old, own, 'devolve o <video> antigo');
assert.equal(p.video, preview, 'player usa o vídeo da prévia');
assert.equal(preview.parentNode, parent, 'vídeo da prévia vai para a tela do player');
assert.equal(preview.style.cssText, 'left:0px;top:0px;width:1920px;height:1080px');
assert.equal(preview.paused, false, 'continua tocando');
own.fire('playing'); assert.equal(playing, 0, 'eventos do vídeo antigo são ignorados');
preview.fire('playing'); assert.equal(playing, 1, 'eventos do vídeo novo chegam');

// Vídeo da prévia já tocando: o player não recarrega.
const q = Object.assign(Object.create(PV), { video: { paused: false, readyState: 4 }, onPlaying() { this.started = true; }, armOpenTimeout() { this.armed = true; } });
q.continueAdopted('http://x/live/1.ts');
assert.equal(q.started, true); assert.equal(q.currentUrl, 'http://x/live/1.ts'); assert.ok(!q.armed);
// Ainda conectando: espera com o tempo limite normal.
const r = Object.assign(Object.create(PV), { video: { paused: true, readyState: 1 }, onPlaying() { this.started = true; }, armOpenTimeout() { this.armed = true; } });
r.continueAdopted('u'); assert.ok(r.armed); assert.ok(!r.started);
console.log('open-speed ok');
