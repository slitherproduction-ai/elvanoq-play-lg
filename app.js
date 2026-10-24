/* ELVANOQ Play LG/webOS – Portal identity, licensing and playlist sync. */
(function () {
  'use strict';
  var PORTAL_URL = 'https://xrrgjssvdqvtrqhxpask.supabase.co/functions/v1/portal-control';
  var PORTAL_KEY = 'sb_publishable_zTZ9IwqmgdIcQfvsy_Qz0w_ZwIOa1kl';
  var PORTAL_WEB_URL = 'https://elvanoqplay.app/adicionar-lista/';
  var STORAGE_KEY = 'elvanoq-lg-device-identity-v1';
  var PLAYLIST_STORAGE_KEY = 'elvanoq-lg-playlists-v1';
  var identity = null;
  var syncInFlight = false;
  var retryAt = 0;
  var keyVisible = true;
  var $ = function (id) { return document.getElementById(id); };
  function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  function randomHex(bytes) {
    var values = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(values);
    else for (var i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(values, function (value) { return value.toString(16).padStart(2, '0'); }).join('');
  }
  function makeLocalIdentity() { return { seed: 'simulator:' + randomHex(20), key: String(Math.floor(100000 + Math.random() * 900000)), source: 'local' }; }
  async function sha256(value) {
    if (!window.crypto || !crypto.subtle) throw new Error('Criptografia indisponível');
    var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.prototype.map.call(new Uint8Array(bytes), function (value) { return value.toString(16).padStart(2, '0'); }).join('');
  }
  function setStatus(message, kind) { var el = $('status'); el.textContent = message; el.className = 'status visible ' + (kind || ''); }
  function visualCode(item) { return text(item.serverCode) || ('LG-' + item.deviceId.slice(0, 12).toUpperCase()); }
  function maskedKey(key) { return '•'.repeat(Math.max(4, key.length)); }
  function displayIdentity(item) { $('identity').className = 'identity'; $('device-id').textContent = visualCode(item); $('device-key').textContent = 'Chave do dispositivo: ' + (keyVisible ? item.key : maskedKey(item.key)); $('toggle-key-button').hidden = false; $('toggle-key-button').textContent = keyVisible ? 'Ocultar chave' : 'Mostrar chave'; $('check-button').disabled = false; var canSync = item.portalRegistered === true && Date.now() >= retryAt; $('sync-button').disabled = !canSync; $('settings-sync-button').disabled = !canSync; }
  function save(item) { localStorage.setItem(STORAGE_KEY, JSON.stringify(item)); }
  function read() { try { var value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return value && /^[a-f0-9]{64}$/i.test(value.deviceId) && text(value.key) ? value : null; } catch (_) { return null; } }
  function readPlaylists() { try { var value = JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY)); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  function savePlaylists(items) { localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(items)); }
  function renderLists() { var items = readPlaylists(); var portal = items.filter(function (item) { return item && item.origin === 'portal-webos'; }); $('list-summary').textContent = portal.length ? portal.map(function (item) { return item.name + ' · ' + item.sourceType.toUpperCase(); }).join(' · ') : 'Nenhuma lista sincronizada do Portal.'; }
  function lgUdid() {
    return new Promise(function (resolve) {
      if (!window.webOS || !webOS.service || !webOS.service.request) return resolve(null);
      try {
        webOS.service.request('luna://com.webos.service.sm', {
          method: 'deviceid/getIDs', parameters: { idType: ['LGUDID'] },
          onSuccess: function (response) { var first = response && response.idList && response.idList[0]; resolve(first && text(first.idValue) ? first.idValue : null); },
          onFailure: function () { resolve(null); }
        });
      } catch (_) { resolve(null); }
    });
  }
  async function toPortalIdentity(udid) {
    var local = udid ? null : makeLocalIdentity();
    // Only a SHA-256 digest reaches the Portal; the LGUDID itself remains on the TV.
    return { deviceId: await sha256(udid || local.seed), key: local ? local.key : String(Math.floor(100000 + Math.random() * 900000)), source: udid ? 'lgudid' : 'local' };
  }
  async function request(action, payload) {
    var controller = new AbortController(); var timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch(PORTAL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PORTAL_KEY }, body: JSON.stringify(Object.assign({ action: action }, payload)), signal: controller.signal });
      return { status: response.status, retryAfter: response.headers.get('Retry-After'), body: await response.json().catch(function () { return {}; }) };
    } finally { clearTimeout(timeout); }
  }
  function applyServerCode(body) { var code = text(body && body.server_code); if (code && identity) { identity.serverCode = code; save(identity); displayIdentity(identity); } }
  async function registerIdentity() { var registration = await request('webos-device-register', { device_id: identity.deviceId, device_key: identity.key, app_version: '0.2.0' }); if (registration.status >= 400) throw new Error('registration'); identity.portalRegistered = registration.body && registration.body.registered !== false; applyServerCode(registration.body); save(identity); displayIdentity(identity); return registration.body; }
  async function activateIdentity() {
    $('consent-button').disabled = true; setStatus('Preparando a identificação segura da TV…');
    var udid = await lgUdid(); identity = await toPortalIdentity(udid); save(identity); displayIdentity(identity);
    $('consent-button').style.display = 'none'; $('consent-copy').style.display = 'none';
    try {
      await registerIdentity();
      setStatus(udid ? 'TV identificada e vinculada ao Portal. Agora você pode buscar sua lista.' : 'Modo de teste: identificação local criada e vinculada ao Portal.');
    } catch (_) { setStatus('A identificação foi salva nesta TV, mas o Portal não pôde registrá-la agora. Tente verificar o acesso novamente.', 'error'); }
  }
  async function registerExistingIdentity() { if (!identity) return activateIdentity(); $('consent-button').disabled = true; setStatus('Vinculando a identificação existente ao Portal…'); try { await registerIdentity(); $('consent-button').style.display = 'none'; $('consent-copy').style.display = 'none'; setStatus('TV vinculada ao Portal. Agora você pode buscar sua lista.', 'granted'); } catch (_) { setStatus('Não foi possível vincular esta TV agora. Tente novamente mais tarde.', 'error'); } finally { $('consent-button').disabled = false; } }
  async function checkAccess() {
    if (!identity) return; $('check-button').disabled = true; setStatus('Consultando sua licença…');
    try {
      var result = await request('webos-license-status', { device_id: identity.deviceId, device_key: identity.key, app_version: '0.2.0' });
      var body = result.body || {}; applyServerCode(body);
      if (window.ELVANOQPlaylist.allowed(body)) setStatus('Acesso liberado.', 'granted'); else setStatus(text(body.message) || 'Esta TV não possui uma licença ativa para reprodução.', 'error');
    } catch (_) { setStatus('Não foi possível consultar a licença agora. Verifique sua conexão e tente novamente.', 'error'); }
    finally { $('check-button').disabled = false; }
  }
  function applyRetry(retryAfter) { var seconds = parseInt(retryAfter, 10); if (!Number.isFinite(seconds) || seconds < 1) seconds = 30; retryAt = Date.now() + seconds * 1000; displayIdentity(identity); setStatus('Muitas tentativas. Aguarde cerca de ' + seconds + ' segundos antes de tentar novamente.', 'error'); setTimeout(function () { if (identity) { retryAt = 0; displayIdentity(identity); } }, seconds * 1000); }
  async function syncPlaylist() {
    if (!identity || syncInFlight || Date.now() < retryAt || identity.portalRegistered !== true) return;
    syncInFlight = true; $('sync-button').disabled = true; $('settings-sync-button').disabled = true; setStatus('Buscando a lista salva no Portal…');
    try { var result = await request('webos-playlist-sync', { device_id: identity.deviceId, device_key: identity.key }); if (result.status === 429) return applyRetry(result.retryAfter); var body = result.body || {}; applyServerCode(body); if (result.status === 401 || result.status === 403) { setStatus('Chave inválida. Confira o vínculo desta TV no Portal.', 'error'); return; } if (result.status >= 400) throw new Error('portal'); if (!window.ELVANOQPlaylist.allowed(body)) { setStatus(text(body.message) || 'O acesso ao conteúdo está bloqueado para esta TV.', 'error'); return; } if (!body.playlist) { setStatus('Nenhuma lista disponível no Portal.'); return; } var merged = window.ELVANOQPlaylist.merge(readPlaylists(), body.playlist, identity.deviceId); if (merged.invalid) { setStatus('A lista recebida do Portal é inválida. Tente novamente ou atualize a lista no Portal.', 'error'); return; } savePlaylists(merged.items); renderLists(); setStatus('Lista do Portal sincronizada com sucesso.', 'granted'); }
    catch (_) { setStatus('Falha temporária ao buscar a lista. Seus dados locais foram preservados.', 'error'); }
    finally { syncInFlight = false; if (identity) displayIdentity(identity); }
  }
  function openPortal() { window.location.href = PORTAL_WEB_URL; }
  function setupRemoteNavigation() { document.addEventListener('keydown', function (event) { if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return; var buttons = Array.prototype.filter.call(document.querySelectorAll('button:not([disabled]):not([hidden])'), function (button) { return button.offsetParent !== null; }); var index = buttons.indexOf(document.activeElement); if (index === -1) return; event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus(); }); }
  function init() {
    identity = read(); if (identity) { displayIdentity(identity); if (identity.portalRegistered === true) { $('consent-button').style.display = 'none'; $('consent-copy').style.display = 'none'; } else { $('consent-button').textContent = 'Vincular identificação existente'; $('consent-copy').textContent = 'Vincule esta identificação já criada para buscar as listas salvas no Portal.'; } setStatus('Identificação recuperada. Vincule a TV no Portal ou busque sua lista.'); } renderLists();
    $('consent-button').addEventListener('click', registerExistingIdentity); $('check-button').addEventListener('click', checkAccess); $('sync-button').addEventListener('click', syncPlaylist); $('settings-sync-button').addEventListener('click', syncPlaylist); $('portal-button').addEventListener('click', openPortal); $('toggle-key-button').addEventListener('click', function () { keyVisible = !keyVisible; if (identity) displayIdentity(identity); }); setupRemoteNavigation();
  }
  document.addEventListener('DOMContentLoaded', init);
}());
