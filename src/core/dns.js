/* DNS seguro (anti-bloqueio de DNS da operadora) — EP.Dns.
 * ES5 + XMLHttpRequest próprio (não usa EP.Http, para nunca passar pelo relay).
 *
 * Só PERGUNTA o IP do servidor (Google, Cloudflare ou Portal). A conexão ao
 * servidor da lista continua saindo da TV, com o IP do cliente (pedido do dono
 * do servidor). Nada aqui contata o servidor da lista.
 *
 * Uso:
 *  - EP.Http.get: numa falha de rede pelo caminho normal, repete pelo IP
 *    (EP.Dns.rewrite) e, se der certo, marca o host por 6 h (markWorked).
 *  - Player: EP.Dns.cachedUrl(url) troca pelo IP quando o host está marcado;
 *    numa falha de abertura, EP.Dns.rewrite(url) dá o endereço pelo IP.
 * Limites: só http:// (em https o certificado não bate com o IP) e o navegador
 * não deixa enviar o cabeçalho Host — funciona com painéis que aceitam acesso
 * pelo IP (a maioria dos Xtream; não os que ficam atrás da Cloudflare).
 * Modo em localStorage 'ep.dnsMode': auto (padrão) | google | cloudflare | off.
 */
(function (EP) {
  'use strict';
  var PROVIDERS = {
    google: { url: 'https://8.8.8.8/resolve?type=A&name=', accept: '' },
    cloudflare: { url: 'https://1.1.1.1/dns-query?type=A&name=', accept: 'application/dns-json' },
    portal: { url: 'https://xrrgjssvdqvtrqhxpask.supabase.co/functions/v1/dns-resolve?name=', accept: '' }
  };
  var MODE_KEY = 'ep.dnsMode', STATE_KEY = 'ep.dnsState';
  var STICKY_MS = 6 * 3600 * 1000, TIMEOUT_MS = 4000;
  var cache = {}, sticky = {}, pending = {}, last = null;

  function now() { return new Date().getTime(); }
  function ls() { try { return window.localStorage; } catch (_) { return null; } }
  function mode() {
    var s = ls(), v = '';
    try { v = s ? s.getItem(MODE_KEY) || '' : ''; } catch (_) {}
    return v === 'google' || v === 'cloudflare' || v === 'off' ? v : 'auto';
  }
  function save() {
    var s = ls(); if (!s) return;
    try { s.setItem(STATE_KEY, JSON.stringify({ cache: cache, sticky: sticky })); } catch (_) {}
  }
  (function restore() {
    var s = ls(), t = now(), h, st = null;
    try { st = s ? JSON.parse(s.getItem(STATE_KEY) || 'null') : null; } catch (_) {}
    if (!st) return;
    if (st.cache) for (h in st.cache) if (st.cache.hasOwnProperty(h) && st.cache[h] && st.cache[h].exp > t) cache[h] = st.cache[h];
    if (st.sticky) for (h in st.sticky) if (st.sticky.hasOwnProperty(h) && st.sticky[h] > t) sticky[h] = st.sticky[h];
  }());

  function parse(url) {
    var m = /^(https?:)\/\/([^\/:?#@]+)(:\d+)?([\s\S]*)$/i.exec(String(url || ''));
    return m ? { protocol: m[1].toLowerCase(), host: m[2].toLowerCase(), port: m[3] || '', rest: m[4] || '' } : null;
  }
  function isIp(host) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf(':') >= 0 || host.charAt(0) === '['; }
  function blocked(ip) { return !ip || ip === '0.0.0.0' || /^127\./.test(ip); }
  function eligible(u) { return !!u && u.protocol === 'http:' && !isIp(u.host) && mode() !== 'off'; }

  function getJson(url, accept) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(), done = false;
      try { x.open('GET', url, true); } catch (e) { reject(new Error('network')); return; }
      x.timeout = TIMEOUT_MS;
      if (accept) { try { x.setRequestHeader('Accept', accept); } catch (_) {} }
      x.onload = function () {
        if (done) return; done = true;
        if (x.status < 200 || x.status >= 300) { reject(new Error('http ' + x.status)); return; }
        try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
      };
      x.onerror = function () { if (!done) { done = true; reject(new Error('network')); } };
      x.ontimeout = function () { if (!done) { done = true; reject(new Error('timeout')); } };
      x.send(null);
    });
  }

  function answer(name, j) {
    if (name === 'portal') {
      return j && j.ips && j.ips.length && !blocked(j.ips[0]) ? { ip: j.ips[0], ttl: j.ttl || 300 } : null;
    }
    if (!j || j.Status !== 0 || !j.Answer) return null;
    for (var i = 0; i < j.Answer.length; i++) {
      var a = j.Answer[i];
      if (a && a.type === 1 && !blocked(a.data)) return { ip: a.data, ttl: Math.max(60, Math.min(a.TTL || 300, 3600)) };
    }
    return null;
  }

  function order() {
    var m = mode();
    if (m === 'off') return [];
    return m === 'auto' ? ['google', 'cloudflare', 'portal'] : [m, 'portal'];
  }

  function resolve(host) {
    host = String(host || '').toLowerCase();
    if (!host || isIp(host) || mode() === 'off') return Promise.reject(new Error('dns off'));
    var c = cache[host];
    if (c && c.exp > now()) return Promise.resolve(c);
    if (pending[host]) return pending[host];
    var list = order(), i = 0;
    var p = new Promise(function (ok, fail) {
      (function next(err) {
        if (i >= list.length) { fail(err || new Error('dns failed')); return; }
        var name = list[i++];
        getJson(PROVIDERS[name].url + encodeURIComponent(host), PROVIDERS[name].accept).then(function (j) {
          var r = answer(name, j);
          if (!r) { next(new Error('no answer')); return; }
          cache[host] = { ip: r.ip, exp: now() + r.ttl * 1000, source: name };
          save();
          ok(cache[host]);
        }, next);
      }());
    });
    pending[host] = p;
    var clear = function () { delete pending[host]; };
    p.then(clear, clear);
    return p;
  }

  function build(u, ip) { return u.protocol + '//' + ip + u.port + u.rest; }

  function note(host, source) {
    last = { host: host, source: source, at: now() };
    try { if (EP.Telemetry && EP.Telemetry.track) EP.Telemetry.track('source_switch', { server_host: host, detail: 'dns:' + source }); } catch (_) {}
  }

  EP.Dns = {
    mode: mode,
    setMode: function (m) {
      var s = ls(); if (!s) return;
      try { s.setItem(MODE_KEY, m === 'google' || m === 'cloudflare' || m === 'off' ? m : 'auto'); } catch (_) {}
      if (m === 'off') EP.Dns.clear();
    },
    LABELS: { auto: 'Automático', google: 'Google', cloudflare: 'Cloudflare', off: 'Desligado' },
    /* Pode tentar pelo IP? (http, domínio, DNS ligado) */
    eligible: function (url) { return eligible(parse(url)); },
    /* O host já precisou do IP (ou provedor fixo)? */
    shouldUseIp: function (url) {
      var u = parse(url);
      if (!eligible(u)) return false;
      return mode() !== 'auto' || (sticky[u.host] || 0) > now();
    },
    /* Promise<{url, ip, source}|null>: mesma URL com o IP no lugar do domínio. */
    rewrite: function (url) {
      var u = parse(url);
      if (!eligible(u)) return Promise.resolve(null);
      return resolve(u.host).then(function (c) { return { url: build(u, c.ip), ip: c.ip, source: c.source, host: u.host }; }, function () { return null; });
    },
    /* Síncrono (player): URL pelo IP se o host está marcado e o IP em cache. */
    cachedUrl: function (url) {
      var u = parse(url);
      if (!EP.Dns.shouldUseIp(url)) return url;
      var c = cache[u.host];
      return c && c.exp > now() ? build(u, c.ip) : url;
    },
    /* O caminho pelo IP funcionou: usar o IP para este host por 6 h. */
    markWorked: function (url, source) {
      var u = parse(url); if (!u) return;
      if (!((sticky[u.host] || 0) > now())) note(u.host, source || (cache[u.host] && cache[u.host].source) || '');
      sticky[u.host] = now() + STICKY_MS;
      save();
    },
    status: function () { return { mode: mode(), last: last }; },
    clear: function () { cache = {}; sticky = {}; last = null; save(); },
    _parse: parse
  };
}(window.EP));
