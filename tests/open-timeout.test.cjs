// 1.1.7 (LG): abertura que fica em "Carregando" sem erro vira falha e reconecta.
const assert = require('node:assert/strict');
global.window = global;
global.document = { visibilityState: 'visible' };
let remembered = 'ts';
global.EP = { LiveFormat: { preferred: () => remembered } };
require('../src/views/playerView.js');
const P = EP.PlayerView.prototype;

let pending = [];
global.setTimeout = (fn, ms) => { pending.push({ fn, ms }); return pending.length; };
global.clearTimeout = () => {};
function fire() { const p = pending; pending = []; p.forEach(t => t.fn()); return p.map(t => t.ms); }
function fake(live) {
  const f = {
    video: { currentTime: 0, paused: true }, content: { liveQueue: live ? [1] : [] }, userPaused: false, errors: 0,
    liveRetries: 0, isLive() { return live; }, isCatchup() { return false; }, onLoadError(t) { if (t.failed) return; t.failed = true; this.errors++; },
    clearOpenTimeout: P.clearOpenTimeout, armOpenTimeout: P.armOpenTimeout, openTimeoutMs: P.openTimeoutMs
  };
  f.loadToken = {};
  return f;
}

// Ao vivo travado em "Carregando": falha depois de 12 s.
let f = fake(true); f.armOpenTimeout(f.loadToken);
assert.deepEqual(fire(), [12000]); assert.equal(f.errors, 1, 'ao vivo sem início vira erro');
// Filme: 30 s.
f = fake(false); f.armOpenTimeout(f.loadToken);
assert.deepEqual(fire(), [30000]); assert.equal(f.errors, 1);
// Já começou: não mexe.
f = fake(true); f.armOpenTimeout(f.loadToken); f.loadToken.started = true; fire(); assert.equal(f.errors, 0);
// Vídeo andando sem evento 'playing': conta como iniciado.
f = fake(true); f.armOpenTimeout(f.loadToken); f.video.currentTime = 3; f.video.paused = false; fire(); assert.equal(f.errors, 0);
// Troca de canal no meio: o timeout antigo é ignorado.
f = fake(true); const old = f.loadToken; f.armOpenTimeout(old); f.loadToken = {}; fire(); assert.equal(f.errors, 0);
// Pausado pelo usuário: espera de novo, sem erro.
f = fake(true); f.userPaused = true; f.armOpenTimeout(f.loadToken); fire(); assert.equal(f.errors, 0); assert.equal(pending.length, 1);
pending = [];
// 1.1.7: sem formato lembrado, a 1ª tentativa do ao vivo desiste em 6 s; depois, 12 s.
remembered = '';
f = fake(true); f.armOpenTimeout(f.loadToken); assert.deepEqual(fire(), [6000]);
f = fake(true); f.liveRetries = 1; f.armOpenTimeout(f.loadToken); assert.deepEqual(fire(), [12000]);
f = fake(false); f.armOpenTimeout(f.loadToken); assert.deepEqual(fire(), [30000]);
remembered = 'ts';
console.log('open-timeout ok');
