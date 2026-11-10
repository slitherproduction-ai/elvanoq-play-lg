/* Equivalente ao PortalService.brs, com as ações próprias do webOS.
 * O LGUDID nunca sai da TV: o Portal recebe somente o SHA-256 completo.
 * Contratos usados (portal-control): webos-device-register,
 * webos-license-status, webos-playlist-sync e server-code-resolve.
 */
(function (EP) {
  'use strict';
  var PORTAL_URL = 'https://xrrgjssvdqvtrqhxpask.supabase.co/functions/v1/portal-control';
  var PORTAL_KEY = 'sb_publishable_zTZ9IwqmgdIcQfvsy_Qz0w_ZwIOa1kl';
  /* Chaves herdadas da versão 0.4.0: mantidas para a TV continuar vinculada. */
  var IDENTITY_KEY = 'elvanoq-lg-device-identity-v1';
  var PLAYLISTS_KEY = 'elvanoq-lg-playlists-v1';

  function readLegacy(key) { try { return JSON.parse(window.localStorage.getItem(key)); } catch (_) { return null; } }
  function writeLegacy(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function randomHex(bytes) {
    var out = '', array = null;
    try { array = new Uint8Array(bytes); window.crypto.getRandomValues(array); } catch (_) { array = null; }
    for (var i = 0; i < bytes; i++) out += ('0' + ((array ? array[i] : Math.floor(Math.random() * 256))).toString(16)).slice(-2);
    return out;
  }

  function lgUdid() {
    return new Promise(function (resolve) {
      var service = window.webOS && window.webOS.service;
      if (!service || !service.request) { resolve(null); return; }
      var settled = false, finish = function (v) { if (!settled) { settled = true; resolve(v); } };
      setTimeout(function () { finish(null); }, 5000);
      try {
        service.request('luna://com.webos.service.sm', {
          method: 'deviceid/getIDs', parameters: { idType: ['LGUDID'] },
          onSuccess: function (r) { var x = r && r.idList && r.idList[0]; finish(x && EP.text(x.idValue) ? x.idValue : null); },
          onFailure: function () { finish(null); }
        });
      } catch (_) { finish(null); }
    });
  }

  /* Mesmo mapeamento de estados do portalState() do Roku. */
  function licenseState(body) {
    body = body || {};
    var license = body.license || {};
    var codeAccess = body.code_access;
    if (license.can_play === true && (!codeAccess || codeAccess.can_connect === true)) return 'active';
    var status = EP.lower(license.status || body.status || '');
    if (status === 'expired' || status === 'expirado') return 'expired';
    if (status === 'blocked' || status === 'bloqueado' || status === 'inactive' || license.code_blocked === true) return 'blocked';
    return 'pending';
  }

  var Portal = EP.Portal = {
    identity: null,
    lastLicenseOkAt: 0,
    retryAt: 0,

    readIdentity: function () {
      var v = readLegacy(IDENTITY_KEY);
      Portal.identity = v && /^[a-f0-9]{64}$/i.test(v.deviceId) && /^\d{6,128}$/.test(String(v.key || '')) ? v : null;
      return Portal.identity;
    },
    saveIdentity: function () { if (Portal.identity) writeLegacy(IDENTITY_KEY, Portal.identity); },
    hasConsent: function () { return !!Portal.identity; },

    /* Só é chamado após o consentimento explícito na tela de ativação. */
    ensureIdentity: function () {
      if (Portal.identity) return Promise.resolve(Portal.identity);
      return lgUdid().then(function (udid) {
        var seed = udid || ('simulator:' + randomHex(20));
        return EP.Sha256.sha256(seed).then(function (digest) {
          var key = String(100000 + Math.floor(Math.random() * 900000));
          Portal.identity = { deviceId: digest, key: key, source: udid ? 'lgudid' : 'local' };
          Portal.saveIdentity();
          return Portal.identity;
        });
      });
    },

    deviceCode: function () {
      var id = Portal.identity;
      if (!id) return '';
      return 'LG-' + id.deviceId.slice(0, 12).toUpperCase();
    },

    request: function (action, payload) {
      if (Date.now() < Portal.retryAt) {
        return Promise.resolve({ ok: false, status: 429, state: 'offline', message: 'Muitas tentativas. Aguarde alguns instantes.', body: {} });
      }
      return EP.Http.postJson(PORTAL_URL, EP.extend({ action: action }, payload), { apikey: PORTAL_KEY, Authorization: 'Bearer ' + PORTAL_KEY }, 20000).then(function (response) {
        var body = EP.Http.json(response) || {};
        var result = { ok: response.status >= 200 && response.status < 300, status: response.status, body: body, message: EP.text(body.message) || EP.text(body.error) || '' };
        if (response.status === 429) {
          var seconds = parseInt(response.header('Retry-After'), 10);
          if (!(seconds > 0)) seconds = 60;
          Portal.retryAt = Date.now() + seconds * 1000;
          result.state = 'offline';
          result.message = 'Muitas tentativas. Tentaremos novamente em ' + seconds + ' segundos.';
        }
        if (body.server_code && Portal.identity && Portal.identity.serverCode !== body.server_code) {
          Portal.identity.serverCode = body.server_code;
          Portal.saveIdentity();
        }
        return result;
      }, function (error) {
        return { ok: false, status: 0, state: 'offline', body: {}, message: error && error.message === 'timeout' ? 'O Portal não respondeu a tempo. LG-NET-0.' : 'Sem conexão com o Portal. LG-NET-0.' };
      });
    },

    identityPayload: function () {
      return { device_id: Portal.identity.deviceId, device_key: Portal.identity.key, app_version: EP.VERSION };
    },

    register: function () {
      return Portal.request('webos-device-register', Portal.identityPayload()).then(function (r) {
        if (r.ok) { Portal.identity.portalRegistered = r.body.registered !== false; Portal.saveIdentity(); }
        return r;
      });
    },

    licenseStatus: function () {
      return Portal.request('webos-license-status', Portal.identityPayload()).then(function (r) {
        if (r.status === 0 || r.status === 429) { r.state = 'offline'; return r; }
        if (r.status === 401 || r.status === 403) {
          r.state = EP.lower(r.body && r.body.license && r.body.license.status) === 'inactive' ? 'blocked' : 'pending';
          return r;
        }
        if (!r.ok) { r.state = 'error'; return r; }
        r.state = licenseState(r.body);
        if (r.state === 'active') Portal.lastLicenseOkAt = Date.now();
        return r;
      });
    },

    /* Revalida antes de reproduzir; reaproveita uma resposta ativa recente
     * para respeitar o limite de 60 consultas / 15 min do Portal. */
    ensurePlayable: function () {
      if (!Portal.identity) return Promise.resolve(false);
      if (Date.now() - Portal.lastLicenseOkAt < 120000) return Promise.resolve(true);
      return Portal.licenseStatus().then(function (r) {
        if (r.state === 'offline' && Portal.lastLicenseOkAt) return true;
        return r.state === 'active';
      });
    },

    playlistSync: function () {
      return Portal.request('webos-playlist-sync', { device_id: Portal.identity.deviceId, device_key: Portal.identity.key }).then(function (r) {
        if (!r.ok) return r;
        var body = r.body;
        if (!EP.PlaylistRules.allowed(body)) { r.ok = false; r.state = licenseState(body); return r; }
        if (!body.playlist) { r.empty = true; return r; }
        var merged = EP.PlaylistRules.merge(Portal.playlists(), body.playlist, Portal.identity.deviceId);
        if (merged.invalid) { r.ok = false; r.message = 'A lista recebida do Portal é inválida.'; return r; }
        writeLegacy(PLAYLISTS_KEY, merged.items);
        r.playlist = merged.entry;
        r.displayName = EP.text(body.display_name) || merged.entry.name;
        return r;
      });
    },

    serverCodeResolve: function (code) {
      if (!Portal.identity) return Promise.resolve({ ok: false, status: 403, body: {}, message: 'Autorize a identificação do aparelho antes de conectar.' });
      return Portal.register().then(function (registered) {
        if (!registered.ok) return registered;
        return Portal.request('server-code-resolve', EP.extend({ code: code, platform: 'webos' }, Portal.identityPayload()));
      }).then(function (r) {
        var server = r.body && (r.body.server || r.body.data || r.body);
        var host = EP.text(server && server.host);
        r.host = host && EP.PlaylistRules.isHttpUrl(host) && !/[@?#]/.test(host) ? host : '';
        return r;
      });
    },

    playlists: function () { var v = readLegacy(PLAYLISTS_KEY); return v && v.length !== undefined ? v : []; },
    portalPlaylist: function () { return EP.find(Portal.playlists(), function (p) { return p && p.origin === 'portal-webos'; }); },
    /* Como no Roku, o acesso por código do servidor fica só em memória:
     * usuário e senha digitados nunca são gravados na TV. */
    manual: null,
    useManualPlaylist: function (entry) {
      Portal.manual = EP.extend({ id: 'manual-code', sourceId: 'manual-code', origin: 'manual-code' }, entry);
      return Portal.manual;
    }
  };
}(window.EP));

