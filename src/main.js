/* Equivalente ao source/main.brs: cria a cena e encaminha o controle remoto. */
(function (EP) {
  'use strict';
  function exitApp() {
    try { if (window.webOS && typeof window.webOS.platformBack === 'function') { window.webOS.platformBack(); return; } } catch (_) {}
    try { window.close(); } catch (_) {}
  }

  var BOOT_START = new Date().getTime(), SPLASH_MIN = 1500; // splash_min_time do Roku

  function hideSplash() {
    var splash = document.getElementById('boot-splash');
    if (!splash) return;
    var wait = Math.max(0, SPLASH_MIN - (new Date().getTime() - BOOT_START));
    setTimeout(function () {
      splash.className = 'hidden';
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 360);
    }, wait);
  }

  function splashVisible() { return !!document.getElementById('boot-splash'); }

  /* Parâmetros de abertura do webOS: { contentId, mediaType } (mesmo formato
   * do deep link do Roku) ou contentTarget (busca/voz da LG). */
  function deepLinkFrom(params) {
    if (typeof params === 'string') { try { params = JSON.parse(params || '{}'); } catch (_) { params = null; } }
    if (!params || typeof params !== 'object') return null;
    var id = params.contentId || params.contentTarget;
    return id ? { contentId: String(id), mediaType: String(params.mediaType || '') } : null;
  }

  function launchParams() {
    try { if (window.PalmSystem && window.PalmSystem.launchParams) return window.PalmSystem.launchParams; } catch (_) {}
    try { var q = /[?&]params=([^&]+)/.exec(window.location.search); if (q) return decodeURIComponent(q[1]); } catch (_) {}
    return null;
  }

  function boot() {
    var stage = document.getElementById('stage');
    EP.Stage.fit(stage);
    var scene = EP.scene = new EP.MainScene(stage);

    document.addEventListener('keydown', function (event) {
      var key = EP.keyName(event);
      if (!key) return;
      if (splashVisible() && key !== 'back') { event.preventDefault(); return; } // ignora teclas durante o splash
      var typing = document.activeElement && document.activeElement.tagName === 'INPUT';
      var consumed = scene.handleKey(key, event);
      if (consumed) { event.preventDefault(); return; }
      if (key === 'back' && !typing) { event.preventDefault(); exitApp(); }
    }, true);

    // Ao sair para a Home da TV, pausa a reprodução e descarrega a prévia.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      try { scene.shell.views[1].stopPreview(); } catch (_) {}
      // Pausa do sistema conta como pausa do usuário: a vigilância não reconecta na volta.
      try { var pv = scene.shell.playerView; if (pv.isVisible()) { pv.userPaused = true; pv.video.pause(); } } catch (_) {}
      try { scene.shell.releaseMemory(); } catch (_) {}
    });

    // App já aberto e chamado de novo pela busca/voz da LG.
    document.addEventListener('webOSRelaunch', function (event) {
      var link = deepLinkFrom(event && event.detail);
      if (link) scene.setDeepLink(link);
    });
    var initialLink = deepLinkFrom(launchParams());
    if (initialLink) scene.setDeepLink(initialLink);

    scene.start();
    hideSplash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}(window.EP));
