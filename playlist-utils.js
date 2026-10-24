/* Shared, dependency-free rules for Portal playlist synchronization. */
(function (root) {
  'use strict';
  function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
  function isHttpUrl(value) {
    try { var parsed = new URL(value); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch (_) { return false; }
  }
  function allowed(body) {
    var license = body && body.license || {};
    var codeAccess = body && body.code_access;
    return body && body.active === true && license.can_play === true && (!codeAccess || codeAccess.can_connect === true);
  }
  function normalize(playlist) {
    if (!playlist || (playlist.kind !== 'm3u' && playlist.kind !== 'xtream')) return null;
    var credentials = playlist.credentials || {};
    if (playlist.kind === 'm3u' && !isHttpUrl(text(credentials.url))) return null;
    if (playlist.kind === 'xtream' && (!isHttpUrl(text(credentials.host)) || !text(credentials.username) || !text(credentials.password))) return null;
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
  function parseM3u(source) {
    var lines = String(source || '').replace(/\r/g, '').split('\n'); var entries = []; var pending = null;
    lines.forEach(function (line) {
      line = line.trim(); if (!line) return;
      if (line.indexOf('#EXTINF:') === 0) { var name = line.split(',').slice(1).join(',').trim() || 'Canal'; var group = (line.match(/group-title="([^"]*)"/) || [])[1] || 'Ao vivo'; pending = { name: name, group: group }; return; }
      if (pending && isHttpUrl(line)) { entries.push({ id: 'm3u:' + entries.length, name: pending.name, group: pending.group, streamUrl: line }); pending = null; }
    });
    return entries;
  }
  function buildXtreamApiUrl(host, username, password, action) {
    var base = String(host || '').replace(/\/+$/, ''); if (!isHttpUrl(base)) return null;
    var url = new URL(base + '/player_api.php'); url.searchParams.set('username', username); url.searchParams.set('password', password); if (action) url.searchParams.set('action', action); return url.toString();
  }
  function xtreamLiveStreams(host, username, password, body) {
    if (!Array.isArray(body)) return []; var base = String(host || '').replace(/\/+$/, '');
    return body.filter(function (item) { return item && item.stream_id != null; }).map(function (item) { return { id: 'xtream:' + item.stream_id, name: text(item.name) || 'Canal', group: text(item.category_name) || 'Ao vivo', streamUrl: base + '/live/' + encodeURIComponent(username) + '/' + encodeURIComponent(password) + '/' + encodeURIComponent(item.stream_id) + '.' + (text(item.container_extension) || 'ts') }; });
  }
  function xtreamMovies(host, username, password, body) {
    if (!Array.isArray(body)) return []; var base = String(host || '').replace(/\/+$/, '');
    return body.filter(function (item) { return item && item.stream_id != null; }).map(function (item) { return { id: 'movie:' + item.stream_id, type: 'movie', title: text(item.name) || 'Filme', group: text(item.category_name) || 'Filmes', poster: text(item.stream_icon), rating: Number(item.rating) || 0, year: Number(item.year) || 0, description: text(item.plot) || 'Conteúdo disponível na sua lista.', streamUrl: base + '/movie/' + encodeURIComponent(username) + '/' + encodeURIComponent(password) + '/' + encodeURIComponent(item.stream_id) + '.' + (text(item.container_extension) || 'mp4') }; });
  }
  function xtreamSeries(body) {
    if (!Array.isArray(body)) return [];
    return body.filter(function (item) { return item && item.series_id != null; }).map(function (item) { return { id: 'series:' + item.series_id, seriesId: item.series_id, type: 'series', title: text(item.name) || 'Série', group: text(item.category_name) || 'Séries', poster: text(item.cover), rating: Number(item.rating) || 0, year: Number(item.year) || 0, description: text(item.plot) || 'Série disponível na sua lista.' }; });
  }
  function xtreamEpisodeUrl(host, username, password, extension, id) { var base = String(host || '').replace(/\/+$/, ''); return base + '/series/' + encodeURIComponent(username) + '/' + encodeURIComponent(password) + '/' + encodeURIComponent(id) + '.' + (text(extension) || 'mp4'); }
  var api = { allowed: allowed, normalize: normalize, merge: merge, isHttpUrl: isHttpUrl, parseM3u: parseM3u, buildXtreamApiUrl: buildXtreamApiUrl, xtreamLiveStreams: xtreamLiveStreams, xtreamMovies: xtreamMovies, xtreamSeries: xtreamSeries, xtreamEpisodeUrl: xtreamEpisodeUrl };
  root.ELVANOQPlaylist = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
