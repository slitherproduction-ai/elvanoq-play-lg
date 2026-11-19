/* Por que a lista não abre (Android 2.17.77, connectionDiagnosis.ts).
 * O navegador da TV não diz se a falha foi de DNS ou de conexão. Quando a
 * lista não responde, o app consulta o nome do servidor no DNS público do
 * Google (HTTPS, sem passar pelo nosso servidor e sem usuário nem senha):
 * - o nome não existe: endereço errado ou desativado;
 * - nem o DNS público responde: TV sem internet;
 * - o nome existe e a conexão demorou: servidor fora do ar ou bloqueado;
 * - o nome existe e a conexão falhou na hora: provável bloqueio da operadora
 *   (DNS) ou servidor fora do ar — sugere trocar o DNS da TV ou do roteador.
 */
(function (EP) {
  'use strict';
  var MESSAGES = {
    blocked: 'Esta TV não conseguiu conectar ao servidor da lista, mas o endereço existe. Pode ser bloqueio da operadora (DNS) ou o servidor fora do ar. Troque o DNS da TV ou do roteador (por exemplo 1.1.1.1 ou 8.8.8.8); se não resolver, fale com a sua revenda.',
    notFound: 'O endereço do servidor da lista não existe. Confira o endereço com a sua revenda.',
    unreachable: 'O servidor da lista não respondeu. Ele pode estar fora do ar ou bloqueado pela operadora. Tente mais tarde ou fale com a sua revenda.',
    offline: 'Esta TV está sem internet. Confira o Wi-Fi ou o cabo e tente de novo.'
  };
  var LABELS = { blocked: 'Bloqueio provável (DNS ou operadora)', notFound: 'Endereço não existe', unreachable: 'Servidor não responde', offline: 'Sem internet' };
  var cache = {}, last = null;

  function hostOf(url) { var m = /^[a-z]+:\/\/([^\/?#:]+)/i.exec(String(url || '')); return m ? m[1].toLowerCase() : ''; }
  function isIp(host) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf(':') >= 0; }

  /* 'exists' | 'missing' | 'unavailable' — XMLHttpRequest próprio (sem relay). */
  function publicDns(host) {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest(), done = false;
      function finish(value) { if (!done) { done = true; resolve(value); } }
      try { xhr.open('GET', 'https://dns.google/resolve?name=' + encodeURIComponent(host) + '&type=A', true); } catch (_) { finish('unavailable'); return; }
      xhr.timeout = 5000;
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) { finish('unavailable'); return; }
        var body = null;
        try { body = JSON.parse(xhr.responseText); } catch (_) {}
        if (!body) finish('unavailable');
        else if (body.Status === 3) finish('missing');
        else if (body.Status === 0) finish(body.Answer && body.Answer.length ? 'exists' : 'missing');
        else finish('unavailable');
      };
      xhr.onerror = function () { finish('unavailable'); };
      xhr.ontimeout = function () { finish('unavailable'); };
      try { xhr.send(null); } catch (_) { finish('unavailable'); }
    });
  }

  /* Regra de decisão (testável): dns da consulta pública e o erro da lista. */
  function decide(dns, failure) {
    if (dns === 'missing') return 'notFound';
    if (dns === 'unavailable') return 'offline';
    return failure === 'timeout' ? 'unreachable' : 'blocked';
  }

  /* Promise da mensagem para a falha `error` ('network' ou 'timeout') ao abrir `url`. */
  function explain(url, error) {
    var host = hostOf(url), failure = error && error.message === 'timeout' ? 'timeout' : 'network';
    if (!host) return Promise.resolve('');
    var key = host + '|' + failure, hit = cache[key];
    if (hit && new Date().getTime() - hit.at < 60000) { last = { at: new Date().getTime(), verdict: hit.verdict }; return Promise.resolve(MESSAGES[hit.verdict]); }
    return (isIp(host) ? Promise.resolve('exists') : publicDns(host)).then(function (dns) {
      var verdict = decide(dns, failure);
      cache[key] = { at: new Date().getTime(), verdict: verdict };
      last = { at: new Date().getTime(), verdict: verdict };
      return MESSAGES[verdict];
    });
  }

  EP.ConnectionDiagnosis = {
    explain: explain,
    decide: decide,
    messages: MESSAGES,
    last: function () { return last; },
    label: function (verdict) { return LABELS[verdict] || ''; }
  };
}(window.EP));
