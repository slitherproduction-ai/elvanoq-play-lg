/* Hora certa para o guia com o relógio da TV errado (Android 2.17.75,
 * serverClock.ts). Fontes: cabeçalho HTTP Date (UTC; vale depois de duas
 * respostas que concordam) e timestamp_now da conta Xtream (ignorado quando a
 * diferença é um número quase exato de horas: painéis que mandam a hora local
 * como UTC). Diferença menor que 2 min: a TV está certa e nada muda.
 * Usado só no guia e no Rever.
 */
(function (EP) {
  'use strict';
  var MIN_OFFSET = 120000, AGREE = 30000, HOUR = 3600000, EARLIEST = Date.UTC(2024, 0, 1);
  var offset = 0, fromHeader = false, pending = null;

  function apply(candidate) { offset = Math.abs(candidate) < MIN_OFFSET ? 0 : Math.round(candidate); }

  EP.Clock = {
    now: function () { return Date.now() + offset; },
    offset: function () { return offset; },
    noteDate: function (header, receivedAt) {
      if (!header) return;
      var server = Date.parse(header);
      if (!isFinite(server) || server < EARLIEST) return;
      var candidate = server + 500 - (receivedAt || Date.now());
      if (pending !== null && Math.abs(candidate - pending) <= AGREE) { fromHeader = true; apply(candidate); }
      pending = candidate;
    },
    noteTimestamp: function (seconds, receivedAt) {
      if (fromHeader) return;
      var value = Number(seconds);
      if (!isFinite(value) || value <= 0 || value * 1000 < EARLIEST) return;
      var candidate = value * 1000 - (receivedAt || Date.now());
      var hours = Math.round(candidate / HOUR);
      if (hours !== 0 && Math.abs(hours) <= 14 && Math.abs(candidate - hours * HOUR) < MIN_OFFSET) return;
      apply(candidate);
    },
    reset: function () { offset = 0; fromHeader = false; pending = null; }
  };
}(window.EP));
