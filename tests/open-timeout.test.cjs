// 1.1.7 (LG): abertura que fica em "Carregando" sem erro vira falha e reconecta.
const assert = require('node:assert/strict');
global.window = global;
global.document = { visibilityState: 'visible' };
global.EP = {};
require('../src/views/playerView.js');
const P = EP.PlayerView.prototype;

let pending = [];
global.setTimeout = (fn, ms) => { pending.push({ fn, ms }); return pending.length; };
global.clearTimeout = () => {};
function fire() { const p = pending; pending = []; p.forEach(t => t.fn()); return p.map(t => t.ms); }
function fake(live) {
  const f = {
    video: { currentTime: 0, paused: true }, content: { liveQueue: live ? [1] : [] }, userPaused: false, errors: 0,
    isLive() { return live; }, onLoadError(t) { if (t.failed) return; t.failed = true; this.errors++; },
    clearOpenTimeout: P.clearOpenTimeout, armOpenTimeout: P.armOpenTimeout
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
console.log('open-timeout ok');
