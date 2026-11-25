// Diagnóstico anônimo de reprodução: eventos do player, limites e envio em lote.
const assert = require('node:assert/strict');
global.window = global;
global.document = { visibilityState: 'visible' };
global.EP = { VERSION: '9.9.9', extend(t) { for (let i = 1; i < arguments.length; i++) Object.assign(t, arguments[i] || {}); return t; } };
const sent = [];
EP.Http = { postJson(url, payload) { sent.push({ url, payload }); return Promise.resolve({ status: 200 }); } };
EP.Portal = { deviceCode: () => 'TV-ABC123' };
let clock = 1000000;
Date.now = () => clock;
const timers = [];
global.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
global.clearTimeout = () => {};
global.setInterval = () => 0; global.clearInterval = () => {};
require('../src/core/telemetry.js');
require('../src/views/playerView.js');
const T = EP.Telemetry, P = EP.PlayerView.prototype;

// Host sem usuário/senha nem caminho; formato pela extensão.
assert.equal(T.hostOf('http://user:pass@srv.exemplo.com:8080/live/u/p/1.ts'), 'srv.exemplo.com:8080');
assert.equal(T.formatOf('http://h/live/u/p/1.m3u8?token=x'), 'hls');
assert.equal(T.formatOf('http://h/live/u/p/1.ts'), 'ts');
assert.equal(T.formatOf('http://h/movie/u/p/9.mkv'), 'mkv');

function fakeLive() {
  return {
    video: { currentTime: 0, ended: false }, content: { id: '77', title: 'Canal Teste', liveQueue: [1] },
    currentUrl: 'http://user:pw@iptv.exemplo.com/live/user/pw/77.ts',
    failed: false, awaitingNextEpisode: false, userPaused: false, hint: { textContent: '' }, osdTimer: { stop() {} },
    showOsd() {}, defaultHint() { return 'ok'; }, isLive() { return true; }, isCatchup() { return false; }, stopWatchdog() {},
    load() { this.video.currentTime = 0; }, showFatal(m) { this.fatal = m; }
  };
}
function run(f, sec, playing) { for (let s = 0; s < sec; s += 4) { clock += 4000; if (playing) f.video.currentTime += 4; P.watchTick.call(f); } }

// Travou no ao vivo e voltou: stall + recovered.
T.startSession();
let f = fakeLive(); P.startWatchdog.call(f); run(f, 40, true); run(f, 24, false); run(f, 12, true);
let events = T.queue.map((e) => e.event);
assert.deepEqual(events, ['stall', 'recovered']);
const stall = T.queue[0];
assert.equal(stall.server_host, 'iptv.exemplo.com');
assert.equal(stall.content_type, 'live'); assert.equal(stall.stream_format, 'ts');
assert.equal(stall.channel_name, 'Canal Teste'); assert.equal(stall.attempt, 1);
assert.ok(stall.duration_ms >= 20000);
assert.ok(!JSON.stringify(T.queue).includes('pw'), 'senha nunca vai no envio');

// Limite de carregamentos por sessão (no máximo 10 "buffering").
T.queue.length = 0; T.startSession();
for (let i = 0; i < 15; i++) T.fromPlayer(f, 'buffering', { duration_ms: 3000 });
assert.equal(T.queue.length, 10);

// Envio em lote: 1 POST com plataforma, versão e código da TV.
timers.length = 0; T.timer = null; T.lastSentAt = 0;
T.schedule(); timers.pop().fn();
assert.equal(sent.length, 1);
const body = sent[0].payload;
assert.equal(body.action, 'report'); assert.equal(body.platform, T.platform); assert.equal(body.app_version, '9.9.9');
assert.equal(body.device_code, 'TV-ABC123'); assert.equal(body.events.length, 10);
assert.equal(T.queue.length, 0);
console.log('telemetry ok');
