/* Escolha do idioma (canvas "Idioma do aplicativo", tela 10): janela no
 * centro com Automático, Português (Brasil) e English; ✓ no idioma em uso,
 * foco em pílula clara. ↑/↓ escolhem, OK confirma, Voltar fecha.
 */
(function (EP) {
  'use strict';
  var S = EP.Stage;
  var OPTIONS = [
    { value: 'auto', label: 'Automático', sub: 'Igual ao idioma da TV' },
    { value: 'pt', label: 'Português (Brasil)', sub: 'Português' },
    { value: 'en', label: 'English', sub: 'Inglês' }
  ];

  function el(tag, css, text) {
    var node = document.createElement(tag);
    if (css) node.style.cssText = css;
    if (text) node.textContent = text;
    return node;
  }

  function LanguageDialog(stage, opts) {
    var self = this;
    this.opts = opts || {};
    this.closed = false;
    var current = EP.I18n.preference();
    this.selected = 0;
    for (var k = 0; k < OPTIONS.length; k++) if (OPTIONS[k].value === current) this.selected = k;
    this.current = current;
    var root = this.root = S.group(stage, { className: 'layer kb-backdrop' });
    root.style.zIndex = '60';
    S.rect(root, { x: 0, y: 0, w: 1920, h: 1080, color: '0x03060CC7' });
    var card = S.el(root, { x: 600, y: 0, w: 720, css: 'box-sizing:border-box;top:50%;-webkit-transform:translateY(-50%);transform:translateY(-50%);padding:44px 40px 32px;border-radius:28px;background:#0e1524;display:-webkit-flex;display:flex;-webkit-flex-direction:column;flex-direction:column' });
    var head = el('div', 'display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;padding:0 26px;color:#f4f8ff');
    var globe = EP.icon('language', 32); globe.style.color = '#00d7ff'; globe.style.marginRight = '14px';
    head.appendChild(globe);
    head.appendChild(el('span', 'font-size:34px;font-weight:700;letter-spacing:-0.5px', 'Idioma do aplicativo'));
    card.appendChild(head);
    card.appendChild(el('div', 'margin:12px 0 18px;padding:0 26px;font-size:20px;line-height:28px;color:#9aa6bd', 'Muda os textos do app. O áudio e as legendas dos vídeos continuam os da sua lista.'));
    this.rows = [];
    for (var i = 0; i < OPTIONS.length; i++) {
      var row = el('div', 'box-sizing:border-box;min-height:84px;margin-top:' + (i ? 10 : 0) + 'px;padding:0 26px;border-radius:18px;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:space-between;justify-content:space-between');
      var texts = el('div', 'display:-webkit-flex;display:flex;-webkit-flex-direction:column;flex-direction:column');
      row.label = el('span', 'font-size:26px;font-weight:600', OPTIONS[i].label);
      row.sub = el('span', 'margin-top:4px;font-size:18px', OPTIONS[i].sub);
      texts.appendChild(row.label); texts.appendChild(row.sub);
      row.appendChild(texts);
      if (OPTIONS[i].value === current) { row.check = EP.icon('checkThin', 28); row.appendChild(row.check); }
      (function (index) { row.addEventListener('click', function () { self.selected = index; self.choose(); }); }(i));
      card.appendChild(row);
      this.rows.push(row);
    }
    card.appendChild(el('div', 'margin-top:16px;padding:0 26px;font-size:18px;color:#7f8ba3', 'OK escolher   •   Voltar fechar'));
    this.render();
  }

  LanguageDialog.prototype.render = function () {
    for (var i = 0; i < this.rows.length; i++) {
      var row = this.rows[i], focused = i === this.selected;
      row.style.background = focused ? '#f4f8ff' : 'transparent';
      row.label.style.color = focused ? '#070b14' : '#f4f8ff';
      row.sub.style.color = focused ? '#4a5568' : '#9aa6bd';
      if (row.check) row.check.style.color = focused ? '#070b14' : '#00d7ff';
    }
  };

  LanguageDialog.prototype.handleKey = function (key) {
    if (key === 'back') { this.close(); return true; }
    if (key === 'up') this.selected = Math.max(0, this.selected - 1);
    else if (key === 'down') this.selected = Math.min(this.rows.length - 1, this.selected + 1);
    else if (key === 'OK') { this.choose(); return true; }
    this.render();
    return true;
  };

  LanguageDialog.prototype.choose = function () {
    var value = OPTIONS[this.selected].value;
    this.close();
    if (value !== this.current) EP.I18n.setPreference(value);
  };

  LanguageDialog.prototype.close = function () {
    if (this.closed) return;
    this.closed = true;
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.opts.onClose) this.opts.onClose();
  };

  EP.LanguageDialog = LanguageDialog;
}(window.EP));
