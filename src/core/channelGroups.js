/* Qualidades do mesmo canal numa linha só (Android 2.17.75, channelGroups.ts).
 * Canais da mesma categoria cujo nome, tirando as marcas de qualidade (4K,
 * FHD, HD, SD, H265, ALT, Backup, Opção N…), é igual viram uma linha com o
 * nome limpo e "N fontes". No player, "Fonte" troca entre elas e, se uma não
 * abre, a próxima é tentada sozinha. Nomes diferentes ("ESPN" e "ESPN 2",
 * "Globo SP" e "Globo RJ") continuam separados.
 */
(function (EP) {
  'use strict';
  var WORDS = '4k|uhd|fhd|full ?hd|hd|sd|hevc|h\\.?265|h\\.?264|1080p?|720p?|480p?|2160p?|[0-9]{2}fps|alt[0-9]?|alternativo|backup|bkp|reserva|op[cç][aã]o ?[0-9]|opc ?[0-9]';
  var TOKEN = new RegExp('(^|[^a-z0-9])(' + WORDS + ')(?=$|[^a-z0-9])', 'gi');
  var SUPER = /ᵁᴴᴰ|ᶠᴴᴰ|ᴴᴰ|ˢᴰ|⁴ᴷ/g;
  var LABELS = [
    [/(^|[^a-z0-9])(4k|uhd|2160p?)(?=$|[^a-z0-9])|⁴ᴷ|ᵁᴴᴰ/i, '4K'],
    [/(^|[^a-z0-9])(fhd|full ?hd|1080p?)(?=$|[^a-z0-9])|ᶠᴴᴰ/i, 'FHD'],
    [/(^|[^a-z0-9])(h\.?265|hevc)(?=$|[^a-z0-9])/i, 'H265'],
    [/(^|[^a-z0-9])(hd|720p?)(?=$|[^a-z0-9])|ᴴᴰ/i, 'HD'],
    [/(^|[^a-z0-9])(sd|480p?)(?=$|[^a-z0-9])|ˢᴰ/i, 'SD'],
    [/(^|[^a-z0-9])(alt[0-9]?|alternativo|backup|bkp|reserva|op[cç][aã]o ?[0-9]|opc ?[0-9])(?=$|[^a-z0-9])/i, 'ALT']
  ];
  var ACCENTS = { 'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'é': 'e', 'ê': 'e', 'è': 'e', 'ë': 'e', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n' };

  function copy(item) { var out = {}; for (var k in item) if (Object.prototype.hasOwnProperty.call(item, k)) out[k] = item[k]; return out; }

  function plain(value) {
    var text = String(value || '');
    if (text.normalize) return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return text.replace(/[áàâãäéêèëíìîïóòôõöúùûüçñ]/gi, function (c) {
      var low = ACCENTS[c.toLowerCase()] || c;
      return c === c.toLowerCase() ? low : low.toUpperCase();
    });
  }

  function label(name) {
    var text = plain(name);
    for (var i = 0; i < LABELS.length; i++) if (LABELS[i][0].test(text)) return LABELS[i][1];
    return '';
  }

  function key(name) {
    return plain(name).toLowerCase().replace(SUPER, ' ').replace(TOKEN, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  function groupName(name) {
    var base = String(name || '').replace(SUPER, ' ').replace(TOKEN, '$1')
      .replace(/[(\[{]\s*[)\]}]/g, ' ')
      .replace(/\s*[-|:•·\/]+\s*$/g, '')
      .replace(/^\s*[-|:•·\/]+\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s+|\s+$/g, '');
    return base || String(name || '').replace(/^\s+|\s+$/g, '');
  }

  /* Rótulos únicos na ordem da lista: FHD, HD, HD 2, Fonte 4… */
  function sourceLabels(items) {
    var used = {}, out = [];
    for (var i = 0; i < items.length; i++) {
      var base = label(items[i].title) || ('Fonte ' + (i + 1));
      used[base] = (used[base] || 0) + 1;
      out.push(used[base] > 1 ? base + ' ' + used[base] : base);
    }
    return out;
  }

  /* Uma linha por canal, na posição da primeira fonte. A linha é uma cópia da
   * 1ª fonte com group_title e sources (as fontes, ela incluída). */
  function group(list) {
    if (!list || list.length < 2) return list || [];
    var groups = {}, order = [], merged = false, i;
    for (i = 0; i < list.length; i++) {
      var item = list[i], base = key(item.title);
      if (!base) { order.push(item); continue; }
      var k = String(item.category || '') + '\u0001' + base;
      if (groups[k]) { groups[k].push(item); merged = true; continue; }
      groups[k] = [item];
      order.push(groups[k]);
    }
    if (!merged) return list;
    var out = [];
    for (i = 0; i < order.length; i++) {
      var entry = order[i];
      if (!(entry instanceof Array)) { out.push(entry); continue; }
      if (entry.length === 1) { out.push(entry[0]); continue; }
      var row = copy(entry[0]);
      row.group_title = groupName(entry[0].title);
      row.sources = entry;
      out.push(row);
    }
    return out;
  }

  /* A linha (ou uma das fontes) tem este id? */
  function matches(row, id) {
    if (!row) return false;
    if (row.id === id) return true;
    if (!row.sources) return false;
    for (var i = 0; i < row.sources.length; i++) if (row.sources[i].id === id) return true;
    return false;
  }

  /* Próxima fonte ainda não tentada (tried: { id: true }). */
  function nextUntried(sources, currentId, tried) {
    if (!sources || sources.length < 2) return null;
    var start = 0, i;
    for (i = 0; i < sources.length; i++) if (sources[i].id === currentId) { start = i; break; }
    for (i = 1; i < sources.length; i++) {
      var candidate = sources[(start + i) % sources.length];
      if (candidate.id !== currentId && !tried[candidate.id]) return candidate;
    }
    return null;
  }

  EP.ChannelGroups = { key: key, label: label, groupName: groupName, sourceLabels: sourceLabels, group: group, matches: matches, nextUntried: nextUntried };
}(window.EP));
