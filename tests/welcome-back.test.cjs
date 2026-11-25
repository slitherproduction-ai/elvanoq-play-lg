// "Bem-vindo de volta": etapas reais (licença → servidor → catálogo → pronto) e saída em qualquer falha.
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const tick = () => new Promise((r) => setImmediate(r));
let queue = [], sync = [];
const EP = { Stage: { show: (r, v) => { if (r) r.visible = v; }, isVisible: (r) => !!r.visible }, Registry: { remove() {}, writeJson() {}, readJson: () => ({ display_name: 'Lista da Sala' }) }, LocalState: {}, Parental: {}, ListScope: { set() {}, idFor() { return 't'; } }, formatNumber: (n) => String(n),
  Portal: { manual: null, playlistSync: () => new Promise((res) => sync.push(res)), portalPlaylist: () => null }, text: (v) => String(v || '').trim(),
  CatalogService: { clearSearchCache() {}, load: () => new Promise((resolve, reject) => queue.push({ resolve, reject })) } };
const ctx = { window: { EP, localStorage: { getItem: () => null } }, Date, setTimeout, clearTimeout }; vm.createContext(ctx);
for (const f of ['mainScene.js', 'appShell.js']) vm.runInContext(fs.readFileSync(__dirname + '/../src/views/' + f, 'utf8'), ctx);
function welcome() { return { active: false, steps: [], start(n) { this.active = true; this.name = n; this.steps = [0]; }, setStep(s) { if (this.active) this.steps.push(s); }, finish(c) { this.counts = c; this.steps.push(3); this.active = false; }, hide() { this.active = false; this.hidden = true; }, isVisible() { return this.active; } }; }
function setup() {
  queue = []; sync = [];
  const scene = Object.create(EP.MainScene.prototype), shell = Object.create(EP.AppShell.prototype);
  Object.assign(scene, { status: {}, licenseTimer: { start() {}, stop() {} }, expiredOverlay: {}, expiredCode: {}, expiredInfo: {}, setLoading() {}, setTone() {}, setActivationVisible(v) { this.activationVisible = v; }, openProblem(o) { this.endWelcome(); this.problem = o; }, shell, welcomeView: welcome() });
  Object.assign(shell, { app: scene, root: { visible: false }, selectedIndex: 0, views: [{}], epg: { configure() {} }, stopPlayback() {}, showSection() {}, applyCatalogResult() { this.catalog = [{ type: 'live' }, { type: 'live' }, { type: 'movies' }]; this.lazy = false; }, resetCategoryCache() {}, refreshCurrent() {}, tryDeepLink() {}, catalog: [], categories: [] });
  return scene;
}
(async () => {
  // Caminho feliz: licença → lista do Portal → catálogo → Início por baixo e tela esmaece.
  let s = setup(); s.startWelcome(); assert.equal(s.welcomeView.name, 'Lista da Sala');
  s.showActivationState('active'); assert.deepEqual(s.welcomeView.steps, [0, 1]);
  s.requestPlaylistSync(false); sync[0]({ ok: true, body: {}, playlist: { name: 'P', origin: 'o' } }); await tick();
  assert.deepEqual(s.welcomeView.steps, [0, 1, 2]);
  queue[0].resolve({ channels: [], categories: [], epg: null }); await tick();
  assert.deepEqual(s.welcomeView.steps, [0, 1, 2, 3]); assert.equal(s.welcomeView.counts, '2 canais · 1 filmes e séries'); assert.equal(s.shell.root.visible, true);
  // Teclas: espera sozinho; Voltar segue (sai do app).
  s = setup(); s.startWelcome(); assert.equal(s.handleKey('OK'), true); assert.equal(s.handleKey('back'), false);
  // Licença expirada/bloqueada/pendente: some e mostra a ativação.
  for (const st of ['expired', 'blocked', 'pending', 'offline', 'error']) { s = setup(); s.startWelcome(); s.showActivationState(st); assert.equal(s.welcomeView.hidden, true, st); }
  // Sem lista no Portal: some.
  s = setup(); s.startWelcome(); s.showActivationState('active'); s.requestPlaylistSync(false); sync[0]({ ok: true, empty: true }); await tick(); assert.equal(s.welcomeView.hidden, true);
  // Servidor IPTV recusou: some antes da janela "A lista não abriu".
  s = setup(); s.startWelcome(); s.showActivationState('active'); s.requestPlaylistSync(false); sync[0]({ ok: true, body: {}, playlist: { name: 'P', origin: 'o' } }); await tick(); queue[0].reject(Error('auth')); await tick(); assert.equal(s.welcomeView.hidden, true); assert.ok(s.problem);
  // Sem lista salva: não abre.
  s = setup(); EP.Registry.readJson = () => null; s.startWelcome(); assert.equal(s.welcomeView.active, false);
  console.log('welcome-back: etapas reais, teclas e saídas em falha OK');
})().catch((e) => { console.error(e); process.exitCode = 1; });
