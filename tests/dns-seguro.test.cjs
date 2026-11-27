/* DNS seguro: falha de rede pelo DNS do sistema → repete pelo IP (Google /
 * Cloudflare / Portal); com o host marcado vai direto pelo IP; https e DNS
 * desligado não mudam nada; falha pelo IP mantém o comportamento anterior. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = fs.existsSync(path.join(__dirname, '..', 'public', 'src')) ? path.join(__dirname, '..', 'public') : path.join(__dirname, '..');

let blockedHosts = {}; let ipWorks = true; const seen = []; const store = {};
global.window = {
  location: { host: 'app.elvanoqplay.com' },
  EP: {},
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
};
global.XMLHttpRequest = function () {
  const x = this;
  x.open = (m, u) => { x.url = u; };
  x.setRequestHeader = () => {};
  x.getResponseHeader = () => null;
  x.send = () => setTimeout(() => {
    seen.push(x.url);
    const u = x.url;
    if (u.startsWith('https://8.8.8.8/')) { x.status = 200; x.responseText = JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '0.0.0.0', TTL: 5 }, { type: 1, data: '203.0.113.10', TTL: 120 }] }); return x.onload(); }
    if (u.startsWith('https://1.1.1.1/')) { x.status = 200; x.responseText = JSON.stringify({ Status: 3 }); return x.onload(); }
    if (u.indexOf('/dns-resolve?') >= 0) { x.status = 200; x.responseText = JSON.stringify({ ips: ['198.51.100.7'], ttl: 300 }); return x.onload(); }
    if (u.startsWith('/api/fetch')) { x.status = 200; x.responseText = 'relay'; return x.onload(); }
    const host = (/^https?:\/\/([^\/:?#]+)/.exec(u) || [])[1];
    if (blockedHosts[host]) return x.onerror();
    if (/^http:\/\/(203\.0\.113\.10|198\.51\.100\.7)/.test(u) && !ipWorks) return x.onerror();
    x.status = 200; x.responseText = 'ok:' + u; x.onload();
  }, 0);
};
global.EP = window.EP;
EP.Config = {}; // sem relay: o caminho do relay continua coberto pelos testes de http
EP.extend = (a, b) => Object.assign({}, a, b);
require(path.join(root, 'src/core/dns.js'));
require(path.join(root, 'src/core/http.js'));

(async () => {
  // DNS do sistema falha → mesmo endereço pelo IP do Google (0.0.0.0 descartado)
  blockedHosts = { 'srv.example': true };
  let r = await EP.Http.get('http://srv.example:8080/player_api.php?a=1', 5000);
  assert.strictEqual(r.text, 'ok:http://203.0.113.10:8080/player_api.php?a=1');
  assert.ok(EP.Dns.shouldUseIp('http://srv.example:8080/live/1.ts'));
  assert.strictEqual(EP.Dns.cachedUrl('http://srv.example:8080/live/1.ts'), 'http://203.0.113.10:8080/live/1.ts');

  // Host marcado: vai direto pelo IP, sem tentar o domínio antes
  seen.length = 0;
  r = await EP.Http.get('http://srv.example:8080/player_api.php?b=2', 5000);
  assert.strictEqual(seen[0], 'http://203.0.113.10:8080/player_api.php?b=2');

  // https não troca pelo IP (certificado)
  blockedHosts = { 'tls.example': true };
  await assert.rejects(EP.Http.get('https://tls.example/x', 5000));
  assert.ok(!seen.some((u) => u.indexOf('name=tls.example') >= 0));

  // IP também falha → erro original, host não fica marcado
  blockedHosts = { 'dead.example': true }; ipWorks = false;
  await assert.rejects(EP.Http.get('http://dead.example/x', 5000));
  assert.ok(!EP.Dns.shouldUseIp('http://dead.example/x'));
  ipWorks = true;

  // Provedor fixo Cloudflare sem resposta → Portal
  EP.Dns.setMode('cloudflare');
  const rw = await EP.Dns.rewrite('http://other.example/a');
  assert.strictEqual(rw.source, 'portal'); assert.strictEqual(rw.url, 'http://198.51.100.7/a');

  // Desligado: nenhuma consulta de DNS
  EP.Dns.setMode('off'); seen.length = 0;
  blockedHosts = { 'off.example': true };
  await assert.rejects(EP.Http.get('http://off.example/x', 5000));
  assert.ok(!seen.some((u) => /8\.8\.8\.8|1\.1\.1\.1|dns-resolve/.test(u)));
  assert.strictEqual(EP.Dns.cachedUrl('http://srv.example:8080/live/1.ts'), 'http://srv.example:8080/live/1.ts');
  console.log('dns-seguro.test: ok');
})().catch((e) => { console.error(e); process.exit(1); });
