/* Diagnóstico anônimo de reprodução (travamentos, falhas de abertura, trocas
 * de formato). Vai para o Portal (Diagnóstico > Reprodução) e é apagado do
 * servidor depois de 7 dias. Nunca envia usuário, senha nem caminho da lista:
 * só o host do servidor, o canal, o formato e o que aconteceu com o vídeo.
 * Envio em lote, no máximo 1 por minuto, e falha em silêncio.
 */
(function (EP) {
  'use strict';
  var ENDPOINT = 'https://xrrgjssvdqvtrqhxpask.supabase.co/functions/v1/tv-telemetry';
  var PLATFORM = 'lg-webos';
  var MAX_QUEUE = 25, FLUSH_AT = 10, SEND_EVERY_MS = 60000, SESSION_CAP = 30, BUFFERING_CAP = 10;

  function hostOf(url) {
    var m = /^[a-z]+:\/\/(?:[^\/?#@]*@)?([^\/?#]+)/i.exec(String(url || ''));
    return m ? m[1].toLowerCase() : '';
  }
  function formatOf(url) {
    var path = String(url || '').split(/[?#]/)[0].toLowerCase();
    var m = /\.([a-z0-9]{2,4})$/.exec(path);
    if (!m) return /\/live\/|\/timeshift\//.test(path) ? 'ts' : '';
    if (m[1] === 'm3u8') return 'hls';
    return m[1] === 'ts' || m[1] === 'mp4' || m[1] === 'mkv' ? m[1] : 'other';
  }

  var T = EP.Telemetry = {
    queue: [], timer: null, lastSentAt: 0, session: { count: 0, buffering: 0 },
    platform: PLATFORM, endpoint: ENDPOINT, hostOf: hostOf, formatOf: formatOf,

    /* Novo conteúdo aberto no player: zera os limites por sessão. */
    startSession: function () { T.session = { count: 0, buffering: 0 }; },

    /* Evento a partir do estado do player (PlayerView). */
    fromPlayer: function (view, event, extra) {
      try {
        var c = (view && view.content) || {};
        var type = view.isCatchup && view.isCatchup() ? 'catchup' : view.isLive && view.isLive() ? 'live'
          : c.nextEpisode || /:episode:/.test(String(c.id || '')) ? 'episode' : 'movie';
        var e = extra || {};
        T.track(event, {
          server_host: hostOf(view.currentUrl), channel_id: String(c.id || ''), channel_name: String(c.title || ''),
          content_type: type, stream_format: formatOf(view.currentUrl),
          duration_ms: e.duration_ms || 0, attempt: e.attempt || 0, detail: e.detail || ''
        });
      } catch (_) {}
    },

    track: function (event, data) {
      var s = T.session;
      if (s.count >= SESSION_CAP) return;
      if (event === 'buffering') { if (s.buffering >= BUFFERING_CAP) return; s.buffering++; }
      s.count++;
      if (T.queue.length >= MAX_QUEUE) return;
      var row = EP.extend({ event: event }, data || {});
      row.duration_ms = Math.max(0, Math.round(Number(row.duration_ms) || 0));
      T.queue.push(row);
      T.schedule();
    },

    schedule: function () {
      if (T.timer || !T.queue.length) return;
      var wait = Math.max(0, T.lastSentAt + SEND_EVERY_MS - Date.now());
      if (T.queue.length < FLUSH_AT) wait = Math.max(wait, 15000);
      T.timer = setTimeout(function () { T.timer = null; T.flush(); }, wait);
    },

    flush: function () {
      if (!T.queue.length || !EP.Http) return;
      var events = T.queue.splice(0, MAX_QUEUE), code = '';
      try { code = EP.Portal && EP.Portal.deviceCode ? EP.Portal.deviceCode() : ''; } catch (_) {}
      T.lastSentAt = Date.now();
      try {
        var p = EP.Http.postJson(ENDPOINT, { action: 'report', platform: PLATFORM, app_version: EP.VERSION || '', device_code: code, events: events }, {}, 15000);
        if (p && p.then) p.then(function () {}, function () {});
      } catch (_) {}
      T.schedule();
    }
  };
}(window.EP));
