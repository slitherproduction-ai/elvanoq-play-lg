/* ELVANOQ Play LG/webOS – device activation bootstrap. */
(function () {
  'use strict';
  var PORTAL_URL = 'https://xrrgjssvdqvtrqhxpask.supabase.co/functions/v1/portal-control';
  var PORTAL_KEY = 'sb_publishable_zTZ9IwqmgdIcQfvsy_Qz0w_ZwIOa1kl';
  var PORTAL_WEB_URL = 'https://elvanoqplay.app';
  var STORAGE_KEY = 'elvanoq-lg-device-identity-v1';
  var identity = null;
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
  function displayIdentity(item) { $('identity').className = 'identity'; $('device-id').textContent = 'LG-' + item.deviceId.slice(0, 12).toUpperCase(); $('device-key').textContent = 'Chave do dispositivo: ' + item.key; $('check-button').disabled = false; }
  function save(item) { localStorage.setItem(STORAGE_KEY, JSON.stringify(item)); }
  function read() { try { var value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return value && /^[a-f0-9]{64}$/i.test(value.deviceId) && text(value.key) ? value : null; } catch (_) { return null; } }
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
      return { status: response.status, body: await response.json().catch(function () { return {}; }) };
    } finally { clearTimeout(timeout); }
  }
  async function activateIdentity() {
    $('consent-button').disabled = true; setStatus('Preparando a identificação segura da TV…');
    var udid = await lgUdid(); identity = await toPortalIdentity(udid); save(identity); displayIdentity(identity);
    $('consent-button').style.display = 'none'; $('consent-copy').style.display = 'none';
    try {
      var registration = await request('webos-device-register', { device_id: identity.deviceId, device_key: identity.key, app_version: '0.1.0' });
      if (registration.status >= 400) throw new Error();
      setStatus(udid ? 'TV identificada. Vincule este código no Portal ELVANOQ.' : 'Modo de teste: identificação local criada. Na TV LG, o identificador seguro será usado automaticamente.');
    } catch (_) { setStatus('A identificação foi salva nesta TV, mas o Portal não pôde registrá-la agora. Tente verificar o acesso novamente.', 'error'); }
  }
  async function checkAccess() {
    if (!identity) return; $('check-button').disabled = true; setStatus('Consultando sua licença…');
    try {
      var result = await request('webos-license-status', { device_id: identity.deviceId, device_key: identity.key, app_version: '0.1.0' });
      var license = result.body && result.body.license || {}; var granted = license.can_play === true;
      if (granted) setStatus('Acesso liberado' + (text(license.expires_at) ? ' até ' + new Date(license.expires_at).toLocaleDateString('pt-BR') : '') + '.', 'granted');
      else setStatus(text(result.body && result.body.message) || 'Esta TV ainda não possui uma licença ativa.', 'error');
    } catch (_) { setStatus('Não foi possível consultar a licença agora. Verifique sua conexão e tente novamente.', 'error'); }
    finally { $('check-button').disabled = false; }
  }
  function openPortal() { window.location.href = PORTAL_WEB_URL; }
  function init() {
    identity = read(); if (identity) { displayIdentity(identity); $('consent-button').style.display = 'none'; $('consent-copy').style.display = 'none'; setStatus('Identificação recuperada. Verifique o acesso ou vincule a TV no Portal.'); }
    $('consent-button').addEventListener('click', activateIdentity); $('check-button').addEventListener('click', checkAccess); $('portal-button').addEventListener('click', openPortal);
  }
  document.addEventListener('DOMContentLoaded', init);
}());
