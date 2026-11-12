// 1.1.7 (paridade Android 2.17.45 / 2.17.48, Roku 1.1.6): barra de tempo com
// foco e aceleração, e capas do TMDB pelo papel e pelo aparelho.
const assert = require('node:assert/strict');
global.window = global;
global.document = { visibilityState: 'visible' };
const shown = new Map();
global.EP = { Stage: { isVisible: (n) => !!n.visible, show: (n, v) => { n.visible = !!v; }, focus: (n, f) => { n.focused = !!f; } } };
require('../src/core/ns.js');
require('../src/views/playerView.js');

// Capas pelo papel (aparelho padrão no Node: sem screen/deviceMemory).
const T = 'https://image.tmdb.org/t/p/original/a.jpg';
assert.equal(EP.sizedImage(T, 'poster'), 'https://image.tmdb.org/t/p/w342/a.jpg');
assert.equal(EP.sizedImage(T, 'detail'), 'https://image.tmdb.org/t/p/w500/a.jpg');
assert.equal(EP.sizedImage(T, 'backdrop'), 'https://image.tmdb.org/t/p/w1280/a.jpg');
assert.equal(EP.sizedImage(T, 'still'), 'https://image.tmdb.org/t/p/w300/a.jpg');
assert.equal(EP.sizedImage(T, 'w185'), 'https://image.tmdb.org/t/p/w185/a.jpg');
assert.equal(EP.sizedImage('http://srv/logo.png', 'poster'), 'http://srv/logo.png');

// Aceleração.
const P = EP.PlayerView;
assert.deepEqual([1, 3, 4, 6, 7, 20].map(P.timelineStepSeconds), [10, 10, 30, 30, 60, 60]);

// Barra de tempo: toques acumulam e o salto é aplicado uma vez.
function fakePlayer() {
  const node = () => ({ visible: false, style: {}, classList: { toggle() {} } });
  const p = Object.create(P.prototype);
  Object.assign(p, {
    video: { currentTime: 600, duration: 3600 }, content: { title: 'Filme' }, failed: false,
    osd: node(), nextPanel: node(), timeline: node(), timelineKnob: node(), timelineProgress: node(), timeLabel: node(), controls: node(),
    controlLabels: [node(), node(), node(), node(), node()], selectedControl: 1,
    seekFocus: false, seekTarget: -1, seekPresses: 0, lastSeekPress: 0,
    seekTimer: { started: 0, start() { this.started++; }, stop() {} },
    osdTimer: { start() {}, stop() {} },
    isPlaying: () => true, isLive: () => false, refreshTrackStatus() {}, renderLiveGuide() {}
  });
  return p;
}
let p = fakePlayer();
p.handleKey('right');
assert.equal(p.seekFocus, true, 'tela limpa: ▶ foca a barra');
assert.equal(p.osd.visible, true);
assert.equal(p.seekTarget, 610);
assert.equal(p.video.currentTime, 600, 'salto ainda não aplicado');
for (let i = 0; i < 6; i++) p.handleKey('right'); // toques 2..7 em sequência
assert.equal(p.seekTarget, 610 + 10 + 10 + 30 + 30 + 30 + 60);
p.commitTimelineSeek();
assert.equal(p.video.currentTime, 780);
assert.equal(p.seekTarget, -1);
p.handleKey('left');
assert.equal(p.seekTarget, 770, 'trocar de direção recomeça no passo de 10 s');

// Fim da barra e início limitados.
p = fakePlayer(); p.video.currentTime = 3595; p.handleKey('right'); assert.equal(p.seekTarget, 3599);
p = fakePlayer(); p.video.currentTime = 4; p.handleKey('left'); assert.equal(p.seekTarget, 0);

// Com os controles na tela: ◀/▶ trocam de botão; ▲ foca a barra; ▼ volta.
p = fakePlayer(); p.osd.visible = true;
p.handleKey('right'); assert.equal(p.selectedControl, 2); assert.equal(p.seekTarget, -1);
p.handleKey('up'); assert.equal(p.seekFocus, true);
p.handleKey('left'); assert.equal(p.seekTarget, 590);
p.handleKey('down'); assert.equal(p.seekFocus, false); assert.equal(p.video.currentTime, 590, '▼ aplica o salto');
// Esconder os controles aplica o salto pendente.
p.handleKey('up'); p.handleKey('right'); p.hideOsd(); assert.equal(p.video.currentTime, 600); assert.equal(p.seekFocus, false);

// Ao vivo não muda: ◀/▶ só selecionam controles.
p = fakePlayer(); p.isLive = () => true; p.switchLiveChannel = () => {}; p.osd.visible = true;
p.handleKey('right'); assert.equal(p.seekTarget, -1); assert.equal(p.selectedControl, 2);

console.log('v117-features.test.cjs: ok');
