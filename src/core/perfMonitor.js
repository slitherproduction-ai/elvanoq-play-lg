/* Desempenho (Ajustes > Diagnóstico > Desempenho), do Android 2.17.36.
 * Mede na TV real, para o suporte atacar o que pesa em vez de supor:
 *  - pausas da tela: o JavaScript parado por mais de PAUSE_MS (controle sem resposta);
 *  - tempo de abertura (da carga da página até o catálogo pronto);
 *  - duração das cargas do catálogo e de cada categoria;
 *  - memória usada pelo app (performance.memory, quando a TV informa);
 *  - encerramento inesperado da sessão anterior (o app sumiu com a tela aberta).
 * Custo: um timer de 250 ms e uma gravação a cada 30 s. Nada de usuário, senha
 * ou endereço da lista é guardado.
 */
(function (EP) {
  'use strict';
  var TICK_MS = 250, PAUSE_MS = 400, HEARTBEAT_MS = 30000, MAX_RECENT = 6;
  var SESSION_KEY = 'perf_session', EXITS_KEY = 'perf_exits';

  function now() { return new Date().getTime(); }
  function sinceLoad() {
    try { if (window.performance && typeof window.performance.now === 'function') return Math.round(window.performance.now()); } catch (_) {}
    return null;
  }

  var startedAt = now();
  var state = {
    started: false, visible: true, section: 'Início',
    pauses: 0, pauseTotal: 0, maxPause: 0, recentPauses: [], syncs: [], exits: [],
    startupMs: null
  };

  function pushRecent(list, item) { list.unshift(item); if (list.length > MAX_RECENT) list.length = MAX_RECENT; }

  function memoryMb() {
    try {
      var m = window.performance && window.performance.memory;
      if (m && m.usedJSHeapSize) return { used: m.usedJSHeapSize / 1048576, limit: m.jsHeapSizeLimit / 1048576 };
    } catch (_) {}
    return null;
  }

  function writeBeat(clean) {
    var memory = memoryMb();
    EP.Registry.writeJson(SESSION_KEY, {
      version: EP.VERSION, startedAt: startedAt, beatAt: now(), section: state.section,
      visible: state.visible, clean: !!clean, memoryMb: memory ? Math.round(memory.used) : null
    });
  }

  function readPrevious() {
    var exits = EP.Registry.readJson(EXITS_KEY, []);
    if (!(exits instanceof Array)) exits = [];
    var beat = EP.Registry.readJson(SESSION_KEY, null);
    // Em segundo plano, a TV fechar o app é normal; com a tela aberta e sem
    // saída pelo Voltar, o app foi encerrado (falta de memória ou erro).
    if (beat && beat.visible && !beat.clean && beat.startedAt !== startedAt) {
      exits.unshift({ at: beat.beatAt, section: beat.section || '', version: beat.version || '', memoryMb: beat.memoryMb, minutes: Math.max(0, Math.round((beat.beatAt - beat.startedAt) / 60000)) });
      if (exits.length > MAX_RECENT) exits.length = MAX_RECENT;
      EP.Registry.writeJson(EXITS_KEY, exits);
    }
    state.exits = exits;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(ts) { var d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function seconds(ms) { return (ms / 1000).toFixed(ms < 10000 ? 1 : 0).replace('.', ',') + ' s'; }

  var Perf = EP.Perf = {
    start: function () {
      if (state.started) return;
      state.started = true;
      readPrevious();
      writeBeat(false);
      var last = now();
      setInterval(function () {
        var t = now(), gap = t - last;
        last = t;
        if (!state.visible || gap < PAUSE_MS) return;
        var ms = gap - TICK_MS;
        state.pauses++; state.pauseTotal += ms; state.maxPause = Math.max(state.maxPause, ms);
        pushRecent(state.recentPauses, { ms: ms, section: state.section, at: t });
      }, TICK_MS);
      setInterval(function () { if (state.visible) writeBeat(false); }, HEARTBEAT_MS);
      document.addEventListener('visibilitychange', function () {
        state.visible = !document.hidden;
        last = now(); // o tempo em segundo plano não é pausa da tela
        writeBeat(false);
      });
    },
    setSection: function (name) {
      if (!name || name === state.section) return;
      state.section = name;
      if (state.started) writeBeat(false);
    },
    /* Saída pelo Voltar da Início: não conta como encerramento inesperado. */
    markCleanExit: function () { state.visible = false; writeBeat(true); },
    markReady: function () { if (state.startupMs === null) state.startupMs = sinceLoad(); },
    recordSync: function (stage, startedMs, items) { pushRecent(state.syncs, { stage: stage, ms: now() - startedMs, items: items || 0, at: now() }); },
    clear: function () {
      state.pauses = 0; state.pauseTotal = 0; state.maxPause = 0; state.recentPauses = []; state.syncs = []; state.exits = [];
      EP.Registry.remove(EXITS_KEY);
    },

    /* Valores prontos para a tela e para o relatório. */
    summary: function () {
      var memory = memoryMb(), lastSync = state.syncs[0], lastExit = state.exits[0], lastPause = state.recentPauses[0];
      var catalog = null, category = null;
      for (var i = 0; i < state.syncs.length; i++) {
        if (!catalog && state.syncs[i].stage === 'catalog') catalog = state.syncs[i];
        if (!category && state.syncs[i].stage === 'category') category = state.syncs[i];
      }
      return {
        startup: state.startupMs !== null ? seconds(state.startupMs) : 'Não medida',
        uptime: Math.round((now() - startedAt) / 60000) + ' min',
        memory: memory ? Math.round(memory.used) + ' de ' + Math.round(memory.limit) + ' MB' : 'Não informada pela TV',
        pauses: state.pauses ? state.pauses + ' (total ' + seconds(state.pauseTotal) + ')' : 'Nenhuma',
        maxPause: state.maxPause ? seconds(state.maxPause) + (lastPause ? ' • última em ' + lastPause.section : '') : '—',
        catalog: catalog ? seconds(catalog.ms) + ' • ' + EP.formatNumber(catalog.items) + ' categorias' : 'Ainda não medido',
        category: category ? seconds(category.ms) + ' • ' + EP.formatNumber(category.items) + ' títulos' : 'Ainda não medida',
        exits: state.exits.length ? String(state.exits.length) : 'Nenhum',
        lastExit: lastExit ? clock(lastExit.at) + ' em ' + (lastExit.section || '—') + ' (v' + lastExit.version + ', ' + lastExit.minutes + ' min' + (lastExit.memoryMb ? ', ' + lastExit.memoryMb + ' MB' : '') + ')' : '—',
        lastSync: lastSync ? clock(lastSync.at) : '—'
      };
    }
  };
}(window.EP));
