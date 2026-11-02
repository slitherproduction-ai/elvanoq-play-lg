/* Porta de source/StreamFormat.brs + MIME para o <video> do webOS. */
(function (root) {
  'use strict';
  function streamFormatForUrl(streamUrl) {
    var url = String(streamUrl || '').toLowerCase();
    if (url.indexOf('output=m3u8') !== -1) return 'hls';
    var path = url.split('?')[0];
    if (/\.m3u8$/.test(path)) return 'hls';
    if (/\.mpd$/.test(path)) return 'dash';
    if (/\.mkv$/.test(path)) return 'mkv';
    if (/\.mp4$/.test(path)) return 'mp4';
    if (/\.ts$/.test(path) || url.indexOf('output=ts') !== -1) return 'ts';
    if (path.indexOf('.m3u8') !== -1) return 'hls';
    return '';
  }
  var MIME = { hls: 'application/vnd.apple.mpegurl', dash: 'application/dash+xml', mkv: 'video/x-matroska', mp4: 'video/mp4', ts: 'video/mp2t' };
  function mimeForUrl(streamUrl) { return MIME[streamFormatForUrl(streamUrl)] || ''; }

  /* Canais Xtream em .ts podem falhar em alguns modelos LG; a 2ª tentativa usa HLS. */
  function hlsAlternative(streamUrl) {
    var url = String(streamUrl || '');
    if (/\/live\/[^?#]+\.ts(\?|#|$)/i.test(url)) return url.replace(/\.ts(\?|#|$)/i, '.m3u8$1');
    return '';
  }

  var api = { streamFormatForUrl: streamFormatForUrl, mimeForUrl: mimeForUrl, hlsAlternative: hlsAlternative };
  root.EP = root.EP || {};
  root.EP.StreamFormat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
