// 1.2.4 (igual ao MSX 1.2.10): acesso por código do servidor salvo na TV. Só grava depois que a lista
// abre; na abertura confere o código no Portal e entra sozinho, com o
// "Bem-vindo de volta" na tela; código cancelado apaga e volta para o login.
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const tick = () => new Promise((r) => setImmediate(r));
let queue = [], resolves = [];
const EP = {
  Config: { storagePrefix: 'elvanoq-lg', platform: 'webos', portalUrl: 'https://portal.test', codePrefix: 'LG-', identitySeed: 't' },
  Stage: { show: (r, v) => { if (r) r.visible = v; }, isVisible: (r) => !!r.visible },
  LocalState: {}, Parental: {}, ListScope: { set() {}, idFor() { return 't'; } }, formatNumber: (n) => String(n),
  text: (v) => String(v || '').trim(), extend: (a, b) => Object.assign({}, a, b), find: (l, f) => (l || []).find(f),
  PlaylistRules: { isHttpUrl: (v) => /^https?:\/\//.test(v) },
  CatalogService: { clearSearchCache() {}, load: () => new Promise((resolve, reject) => queue.push({ resolve, reject })) }
};
const ctx = { window: { EP }, Date, setTimeout, clearTimeout, JSON };
vm.createContext(ctx);
const src = (p) => fs.readFileSync(__dirname + '/../src/' + p, 'utf8');
vm.runInContext(src('core/storage.js'), ctx);          // Registry real (memória, sem localStorage)
vm.runInContext(src('services/portalService.js'), ctx); // savedCodeLogin / rememberCodeLogin / forgetCodeLogin reais
const Portal = EP.Portal;
Portal.serverCodeResolve = () => new Promise((res) => resolves.push(res));
Portal.playlistSync = () => new Promise(() => {});
for (const f of ['views/mainScene.js', 'views/appShell.js']) vm.runInContext(src(f), ctx);

function welcome() { return { active: false, steps: [], start(n) { this.active = true; this.name = n; this.steps = [0]; }, setStep(s) { if (this.active) this.steps.push(s); }, finish(c) { this.steps.push(3); this.active = false; this.finished = true; }, hide() { this.active = false; this.hidden = true; }, isVisible() { return this.active; } }; }
function setup() {
  queue = []; resolves = []; Portal.manual = null;
  const scene = Object.create(EP.MainScene.prototype), shell = Object.create(EP.AppShell.prototype);
  Object.assign(scene, { status: {}, licenseTimer: { start() {}, stop() {} }, expiredOverlay: {}, expiredCode: {}, expiredInfo: {}, setLoading() {}, setTone() {}, checkLicense() { this.checked = true; }, setActivationVisible(v) { this.activationVisible = v; }, openProblem(o) { this.endWelcome(); this.problem = o; }, shell, welcomeView: welcome() });
  Object.assign(shell, { app: scene, root: { visible: false }, selectedIndex: 0, views: [{}], epg: { configure() {} }, stopPlayback() {}, showSection() {}, applyCatalogResult() { this.catalog = [{ type: 'live' }]; this.lazy = false; }, resetCategoryCache() {}, refreshCurrent() {}, tryDeepLink() {}, catalog: [], categories: [] });
  return scene;
}
function loginNow(scene, password) {
  // O que askCredentials faz ao tocar em "Conectar".
  const playlist = Portal.useManualPlaylist({ name: 'Acesso por código', sourceType: 'xtream', credentials: { host: 'http://srv.exemplo:8080', username: 'joao', password } });
  Portal.pendingCodeLogin = { code: 'revenda1', host: 'http://srv.exemplo:8080', username: 'joao', password };
  scene.manualSession = true;
  scene.shell.applyPlaylist({ display_name: 'Acesso por código', server_code: 'revenda1', playlist });
}

(async () => {
  assert.equal(Portal.savedCodeLogin(), null, 'TV nova: nada salvo');

  // Senha errada: a lista não abre e nada é gravado.
  let s = setup(); loginNow(s, 'errada'); queue[0].reject(Error('auth')); await tick();
  assert.equal(Portal.savedCodeLogin(), null, 'só grava depois que a lista abre');

  // Lista abriu: código, usuário e senha ficam salvos.
  s = setup(); loginNow(s, 'certa'); queue[0].resolve({ channels: [], categories: [], epg: null }); await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(Portal.savedCodeLogin())), { code: 'revenda1', host: 'http://srv.exemplo:8080', username: 'joao', password: 'certa' });

  // Reabriu o app: Bem-vindo de volta, confere o código no Portal e entra sozinho.
  s = setup(); s.startWelcome(); s.resumeCodeLogin();
  assert.equal(s.welcomeView.active, true); assert.equal(s.manualSession, true);
  s.showActivationState('pending'); // TV sem licença própria do Portal: não derruba o Bem-vindo
  assert.equal(s.welcomeView.hidden, undefined, 'licença pendente não encerra o Bem-vindo do acesso por código');
  resolves[0]({ ok: true, host: 'http://srv-novo.exemplo:8080', body: {} }); await tick();
  assert.equal(Portal.manual.credentials.host, 'http://srv-novo.exemplo:8080', 'usa o servidor atual do código');
  assert.equal(Portal.manual.credentials.password, 'certa');
  queue[0].resolve({ channels: [], categories: [], epg: null }); await tick();
  assert.equal(s.welcomeView.finished, true); assert.equal(s.shell.root.visible, true, 'entrou na lista sem pedir nada');
  assert.equal(Portal.savedCodeLogin().host, 'http://srv-novo.exemplo:8080', 'servidor atualizado no que fica salvo');

  // Sem internet ao abrir: usa o último servidor salvo.
  s = setup(); s.startWelcome(); s.resumeCodeLogin(); resolves[0]({ ok: false, status: 0 }); await tick();
  assert.equal(Portal.manual.credentials.host, 'http://srv-novo.exemplo:8080');

  // Código cancelado pela revenda: apaga, sai do Bem-vindo e volta para o login com o motivo.
  s = setup(); s.startWelcome(); s.resumeCodeLogin(); resolves[0]({ ok: false, status: 403, message: 'Código cancelado.' }); await tick();
  assert.equal(Portal.savedCodeLogin(), null); assert.equal(s.manualSession, false); assert.equal(Portal.manual, null);
  assert.equal(s.welcomeView.hidden, true); assert.equal(s.activationVisible, true); assert.equal(s.status.textContent, 'Código cancelado.');
  assert.equal(queue.length, 0, 'não tenta abrir a lista');

  // Sem acesso salvo: nada muda (fluxo da lista do Portal).
  s = setup(); s.resumeCodeLogin(); assert.equal(resolves.length, 0); assert.equal(s.manualSession, undefined);

  // Começou outro login enquanto conferia: a resposta antiga não entra.
  loginNow(setup(), 'certa'); queue[0].resolve({ channels: [], categories: [], epg: null }); await tick();
  s = setup(); s.resumeCodeLogin(); s.codeLoginActive = true; resolves[0]({ ok: true, host: 'http://x.exemplo', body: {} }); await tick();
  assert.equal(queue.length, 0);

  // Excluir login apaga o acesso salvo.
  Portal.forgetCodeLogin(); assert.equal(Portal.savedCodeLogin(), null);
  console.log('code-login-remember: salva após abrir, entra sozinho, offline, cancelado e excluir OK');
})().catch((e) => { console.error(e); process.exitCode = 1; });
