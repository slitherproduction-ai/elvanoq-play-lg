/* Normaliza o controle LG (keyCodes webOS) para os nomes de tecla do Roku,
 * assim as views usam exatamente a mesma lógica de onKeyEvent.
 *
 * Roku "*" (options) não existe no controle LG: usamos o botão AZUL (e também
 * VERMELHO e INFO) como equivalente. Os textos de ajuda mostram "AZUL".
 */
(function (EP) {
  'use strict';
  var MAP = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',
    13: 'OK',
    461: 'back', 8: 'back', 27: 'back',
    406: 'options', 403: 'options', 457: 'options', 112: 'options', 82: 'options',
    404: 'green', 405: 'yellow',
    415: 'play', 19: 'pause', 413: 'stop', 179: 'play',
    412: 'rev', 417: 'fwd', 227: 'rev', 228: 'fwd',
    33: 'channelUp', 34: 'channelDown', 427: 'channelUp', 428: 'channelDown'
  };
  EP.OPTIONS_LABEL = 'AZUL';

  EP.keyName = function (event) {
    var code = event.keyCode || event.which;
    if (code >= 48 && code <= 57) return String(code - 48);
    if (code >= 96 && code <= 105) return String(code - 96);
    if (MAP[code]) return MAP[code];
    if (event.key === 'Enter') return 'OK';
    return '';
  };
}(window.EP));
