/* XMLHttpRequest com timeout, retornando Promise (sem fetch/AbortController,
 * indisponíveis em webOS antigos). Nunca registra URLs ou respostas.
 */
(function (EP) {
  'use strict';
  function request(method, url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var done = false;
      try { xhr.open(method, url, true); } catch (e) { reject(new Error('network')); return; }
      xhr.timeout = options.timeout || 15000;
      var headers = options.headers || {};
      for (var name in headers) if (Object.prototype.hasOwnProperty.call(headers, name)) xhr.setRequestHeader(name, headers[name]);
      xhr.onload = function () {
        if (done) return; done = true;
        resolve({ status: xhr.status, text: xhr.responseText || '', header: function (h) { try { return xhr.getResponseHeader(h); } catch (_) { return null; } } });
      };
      xhr.onerror = function () { if (done) return; done = true; reject(new Error('network')); };
      xhr.ontimeout = function () { if (done) return; done = true; reject(new Error('timeout')); };
      xhr.send(options.body === undefined ? null : options.body);
    });
  }

  EP.Http = {
    get: function (url, timeout) { return request('GET', url, { timeout: timeout }); },
    postJson: function (url, payload, headers, timeout) {
      return request('POST', url, { timeout: timeout, headers: EP.extend({ 'Content-Type': 'application/json', Accept: 'application/json' }, headers), body: JSON.stringify(payload) });
    },
    json: function (response) { try { return JSON.parse(response.text); } catch (_) { return null; } },
    query: function (params) {
      var parts = [];
      for (var key in params) if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined && params[key] !== null) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      return parts.join('&');
    }
  };
}(window.EP));
