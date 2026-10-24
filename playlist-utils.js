/* Shared, dependency-free rules for Portal playlist synchronization. */
(function (root) {
  'use strict';
  function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  function allowed(body) {
    var license = body && body.license || {};
    var codeAccess = body && body.code_access;
    return body && body.active === true && license.can_play === true && (!codeAccess || codeAccess.can_connect === true);
  }
  function normalize(playlist) {
    if (!playlist || (playlist.kind !== 'm3u' && playlist.kind !== 'xtream')) return null;
    var credentials = playlist.credentials || {};
    if (playlist.kind === 'm3u' && !text(credentials.url)) return null;
    if (playlist.kind === 'xtream' && (!text(credentials.host) || !text(credentials.username) || !text(credentials.password))) return null;
    return {
      name: text(playlist.name) || 'Lista do Portal',
      sourceType: playlist.kind,
      credentials: playlist.kind === 'm3u' ? { url: credentials.url } : { host: credentials.host, username: credentials.username, password: credentials.password },
      updatedAt: text(playlist.updated_at) || null
    };
  }
  function merge(existing, playlist, deviceId) {
    var items = Array.isArray(existing) ? existing.slice() : [];
    var normalized = normalize(playlist);
    if (!normalized) return { items: items, changed: false, invalid: true };
    var sourceId = 'portal-webos:' + deviceId;
    var entry = Object.assign({}, normalized, { id: sourceId, sourceId: sourceId, origin: 'portal-webos' });
    var index = items.findIndex(function (item) { return item && item.sourceId === sourceId; });
    if (index === -1) items.push(entry); else items[index] = Object.assign({}, items[index], entry);
    return { items: items, changed: true, invalid: false, entry: entry };
  }
  var api = { allowed: allowed, normalize: normalize, merge: merge };
  root.ELVANOQPlaylist = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
