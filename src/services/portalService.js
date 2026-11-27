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
  var CODE_LOGIN_KEY = 'code_login';

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
    sessionAuthorized: false,
    authorizationIdentity: "",
    authorizationUntil: null,
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

    // Only called at launch, resume, or an explicit activation/payment action.
    licenseStatus: function () {
      var subject = Portal.identity ? Portal.identity.deviceId + ':' + Portal.identity.key : '';
      return Portal.request('webos-license-status', Portal.identityPayload()).then(function (r) {
        if (!Portal.identity || subject !== Portal.identity.deviceId + ':' + Portal.identity.key) return { ok: false, state: 'offline', status: 0, body: {}, message: 'Identificação alterada. Verifique novamente.' };
        if (r.status === 0 || r.status === 429 || r.status >= 500) {
          var age = Date.now() - Portal.lastLicenseOkAt;
          var until = Portal.authorizationUntil ? Date.parse(Portal.authorizationUntil) : Infinity;
          if (Portal.authorizationIdentity === subject && Portal.sessionAuthorized && age >= 0 && age <= 86400000 && until > Date.now()) {
            r.ok = true; r.state = 'active'; r.cachedAuthorization = true;
            r.message = 'Portal temporariamente indisponível. Mantida a última autorização válida.';
          } else { Portal.sessionAuthorized = false; r.state = 'offline'; }
          return r;
        }
        r.state = r.status === 401 || r.status === 403 || r.status === 409 ? 'blocked' : r.ok ? licenseState(r.body) : 'error';
        Portal.sessionAuthorized = r.state === 'active';
        if (Portal.sessionAuthorized) {
          Portal.lastLicenseOkAt = Date.now(); Portal.authorizationIdentity = subject;
          Portal.authorizationUntil = r.body.license && (r.body.license.expires_at || r.body.license.access_until) || null;
        } else { Portal.lastLicenseOkAt = 0; Portal.authorizationIdentity = ''; Portal.authorizationUntil = null; }
        return r;
      });
    },

    // Playback consumes the current session decision; it never calls the Portal.
    ensurePlayable: function () {
      var subject = Portal.identity ? Portal.identity.deviceId + ':' + Portal.identity.key : '';
      return Promise.resolve(!!subject && Portal.sessionAuthorized === true && Portal.authorizationIdentity === subject);
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
        if (r.ok && r.body && r.body.license) {
          Portal.sessionAuthorized = licenseState(r.body) === 'active';
          Portal.authorizationIdentity = Portal.sessionAuthorized && Portal.identity ? Portal.identity.deviceId + ':' + Portal.identity.key : '';
          Portal.lastLicenseOkAt = Portal.sessionAuthorized ? Date.now() : 0;
          Portal.authorizationUntil = r.body.license.expires_at || r.body.license.access_until || null;
        } else if (!r.ok && r.status !== 0 && r.status !== 429 && r.status < 500) {
          Portal.sessionAuthorized = false; Portal.authorizationIdentity = ''; Portal.lastLicenseOkAt = 0;
        }
        var server = r.body && (r.body.server || r.body.data || r.body);
        var host = EP.text(server && server.host);
        r.host = host && EP.PlaylistRules.isHttpUrl(host) && !/[@?#]/.test(host) ? host : '';
        if (r.ok && !r.body.license) return Portal.licenseStatus().then(function (grant) {
          return grant.state === 'active' ? r : { ok: false, status: grant.status, body: grant.body, message: grant.message || 'A licença não está ativa.' };
        });
        return r;
      });
    },

    playlists: function () { var v = readLegacy(PLAYLISTS_KEY); return v && v.length !== undefined ? v : []; },
    portalPlaylist: function () { return EP.find(Portal.playlists(), function (p) { return p && p.origin === 'portal-webos'; }); },
    /* Acesso por código do servidor. 1.2.10 (pedido em 27/11): fica salvo
     * nesta TV depois que a lista abre, para o "Bem-vindo de volta" entrar
     * sozinho. Na abertura o código é conferido de novo no Portal (a revenda
     * continua podendo cancelar). "Excluir login" em Ajustes apaga. */
    manual: null,
    pendingCodeLogin: null,
    savedCodeLogin: function () {
      var s = EP.Registry.readJson(CODE_LOGIN_KEY, null);
      if (!s || typeof s !== 'object') return null;
      var ok = function (v, max) { return typeof v === 'string' && v.length > 0 && v.length <= max; };
      return ok(s.code, 32) && ok(s.username, 200) && ok(s.password, 200) ? s : null;
    },
    rememberCodeLogin: function () {
      if (!Portal.pendingCodeLogin) return;
      EP.Registry.writeJson(CODE_LOGIN_KEY, Portal.pendingCodeLogin);
      Portal.pendingCodeLogin = null;
    },
    forgetCodeLogin: function () { EP.Registry.remove(CODE_LOGIN_KEY); Portal.pendingCodeLogin = null; },
    useManualPlaylist: function (entry) {
      Portal.manual = EP.extend({ id: 'manual-code', sourceId: 'manual-code', origin: 'manual-code' }, entry);
      return Portal.manual;
    }
  };
}(window.EP));


