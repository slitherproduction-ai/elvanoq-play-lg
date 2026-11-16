/* Idioma do aplicativo (Português / English / Automático), igual ao Android
 * 2.17.72. Os textos continuam em português no código; em inglês, cada texto
 * que aparece na tela passa pelo dicionário EP.I18N_EN (texto exato ou modelo
 * com partes variáveis, "Versão {0}"). Com o app em português nada é
 * traduzido. Trocar o idioma salva a escolha e reabre o app.
 */
(function (EP) {
  'use strict';
  var KEY = 'language';
  var DAYS = { pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  var SHORT_DAYS = { pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  var MONTHS = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

  function deviceLanguage() {
    var locale = '';
    try { locale = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage || ''; } catch (_) {}
    return /^pt/i.test(locale) ? 'pt' : (locale ? 'en' : 'pt');
  }
  function preference() {
    var value = EP.Registry ? EP.Registry.read(KEY) : null;
    return value === 'pt' || value === 'en' ? value : 'auto';
  }
  var current = preference() === 'auto' ? deviceLanguage() : preference();

  function normalize(text) { return String(text).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function escape(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var exact = {}, buckets = {}, tails = [], built = false;
  function build() {
    built = true;
    var dict = EP.I18N_EN || {}, key;
    for (key in dict) {
      if (!dict.hasOwnProperty(key)) continue;
      var pt = normalize(key);
      if (!/\{\d+\}/.test(pt)) { exact[pt] = dict[key]; continue; }
      var parts = pt.split(/(\{\d+\})/), source = '^', literal = 0;
      for (var i = 0; i < parts.length; i++) {
        if (/^\{\d+\}$/.test(parts[i])) source += '([\\s\\S]*?)';
        else { source += escape(parts[i]); literal += parts[i].length; }
      }
      var pattern = { regex: new RegExp(source + '$'), en: dict[key], literal: literal };
      var head = normalize(pt.split(/\{\d+\}/)[0]).split(' ')[0];
      if (head) (buckets[head] = buckets[head] || []).push(pattern);
      else tails.push(pattern);
    }
    function byLiteral(a, b) { return b.literal - a.literal; }
    for (key in buckets) if (buckets.hasOwnProperty(key)) buckets[key].sort(byLiteral);
    tails.sort(byLiteral);
  }
  function fill(template, groups) {
    return template.replace(/\{(\d+)\}/g, function (_, index) { return translate(groups[Number(index)] || ''); });
  }
  function translate(text) {
    if (!built) build();
    var trimmed = normalize(text);
    if (!trimmed) return text;
    var lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0];
    if (exact.hasOwnProperty(trimmed)) return lead + exact[trimmed] + trail;
    var list = buckets[trimmed.split(' ')[0]] || [], match, i;
    for (i = 0; i < list.length; i++) { match = list[i].regex.exec(trimmed); if (match) return lead + fill(list[i].en, match.slice(1)) + trail; }
    for (i = 0; i < tails.length; i++) { match = tails[i].regex.exec(trimmed); if (match) return lead + fill(tails[i].en, match.slice(1)) + trail; }
    return text;
  }

  function translateTextNode(node) {
    var data = node.data;
    if (node.__elqText === data || !/[A-Za-zÀ-ú]/.test(data)) return;
    var out = translate(data);
    node.__elqText = out;
    if (out !== data) node.data = out;
  }
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (root.tagName === 'INPUT' && root.placeholder) root.placeholder = translate(root.placeholder);
    var walker = document.createTreeWalker(root, 4, null, false), node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.querySelectorAll) {
      var inputs = root.querySelectorAll('input[placeholder]');
      for (var i = 0; i < inputs.length; i++) inputs[i].placeholder = translate(inputs[i].placeholder);
    }
  }

  EP.I18n = {
    preference: preference,
    language: function () { return current; },
    locale: function () { return current === 'en' ? 'en-US' : 'pt-BR'; },
    days: function () { return DAYS[current]; },
    shortDays: function () { return SHORT_DAYS[current]; },
    months: function () { return MONTHS[current]; },
    /* Data curta do relógio: "Segunda, 16 nov" / "Monday, Nov 16". */
    clockDate: function (date) {
      return current === 'en'
        ? DAYS.en[date.getDay()] + ', ' + MONTHS.en[date.getMonth()] + ' ' + date.getDate()
        : DAYS.pt[date.getDay()] + ', ' + date.getDate() + ' ' + MONTHS.pt[date.getMonth()];
    },
    /* Salva a escolha e reabre o app no novo idioma. */
    setPreference: function (value) {
      if (value === 'auto') EP.Registry.remove(KEY); else EP.Registry.write(KEY, value);
      var next = value === 'auto' ? deviceLanguage() : value;
      if (next === current) return;
      try { window.location.reload(); } catch (_) {}
    },
    /* Traduz a tela inteira e tudo o que aparecer depois (só em inglês). */
    start: function () {
      if (current === 'pt' || !document.body) return;
      translateTree(document.body);
      if (!window.MutationObserver) return;
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          if (record.type === 'characterData') translateTextNode(record.target);
          else for (var j = 0; j < record.addedNodes.length; j++) translateTree(record.addedNodes[j]);
        }
      }).observe(document.body, { childList: true, characterData: true, subtree: true });
    }
  };
  EP.tr = function (text) { return current === 'pt' || !text ? text : translate(String(text)); };
}(window.EP = window.EP || {}));
