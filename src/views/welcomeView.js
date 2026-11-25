/* "Bem-vindo de volta" (canvas aprovado em 2026-11-25): TV já licenciada e com
 * lista salva abre direto nesta tela, no fundo do login, enquanto confere a
 * licença, conecta no servidor da lista e carrega o catálogo. O anel em volta
 * do símbolo do ELVANOQ Play avança com essas etapas reais (não por tempo); o
 * cometa, a órbita e o satélite só giram. Pronto: "Tudo pronto" e esmaece para
 * a Início. Qualquer falha some com a tela e a ativação/janela de problema
 * aparecem como antes. Só transform/opacity (fluido em TVs fracas).
 */
(function (EP) {
  'use strict';
  var S = EP.Stage;
  var R = 144, C = 2 * Math.PI * R;
  var LABELS = ['Confirmando a licença…', 'Conectando ao servidor da lista…', 'Carregando canais, filmes e séries…', 'Tudo pronto'];
  var TIPS = [
    'No ao vivo, aperte → duas vezes para abrir as opções do canal.',
    'Segure OK num canal ou filme para salvar na Minha Lista.',
    'Em Ajustes você esconde as categorias que não usa.'
  ];
  var MAX_MS = 60000;

  function greeting(date) {
    var h = (date || new Date()).getHours();
    return h >= 5 && h < 12 ? 'Bom dia,' : h >= 12 && h < 18 ? 'Boa tarde,' : 'Boa noite,';
  }

  function WelcomeView(stage) {
    var root = this.root = S.group(stage, { visible: false });
    root.className = (root.className ? root.className + ' ' : '') + 'wb';
    root.style.zIndex = '46';
    S.rect(root, { x: 0, y: 0, w: 1920, h: 1080, color: '0x070B14FF' });
    S.poster(root, { x: 0, y: 0, w: 1920, h: 1080, uri: 'images/elvanoq-login-tv-backdrop.jpg' });
    S.el(root, { x: 0, y: 0, w: 1920, h: 1080, css: 'background:radial-gradient(ellipse 46% 58% at 50% 50%,rgba(4,8,15,0.72) 0%,rgba(4,8,15,0.45) 60%,rgba(4,8,15,0) 100%)' });
    var box = this.box = S.el(root, { x: 0, y: 0, w: 1920, h: 1080, html:
      '<div class="wb-col">' +
        '<div class="wb-ring wb-in">' +
          '<div class="wb-halo"></div>' +
          '<svg class="wb-layer" width="330" height="330" viewBox="0 0 330 330"><circle cx="165" cy="165" r="' + R + '" fill="none" stroke="#10213A" stroke-width="3"></circle>' +
            '<circle class="wb-progress" cx="165" cy="165" r="' + R + '" fill="none" stroke="#00D7FF" stroke-width="6" stroke-linecap="round" transform="rotate(-90 165 165)" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"></circle></svg>' +
          '<div class="wb-layer wb-orbit"><svg width="330" height="330" viewBox="0 0 330 330"><circle cx="165" cy="165" r="126" fill="none" stroke="#1E3654" stroke-width="2" stroke-dasharray="3 15" stroke-linecap="round"></circle></svg></div>' +
          '<div class="wb-layer wb-comet"><svg width="330" height="330" viewBox="0 0 330 330"><defs><linearGradient id="wbComet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00D7FF" stop-opacity="0"></stop><stop offset="1" stop-color="#7FEBFF" stop-opacity="1"></stop></linearGradient></defs>' +
            '<path d="M165 21 A144 144 0 0 1 309 165" fill="none" stroke="url(#wbComet)" stroke-width="6" stroke-linecap="round"></path><circle cx="309" cy="165" r="7" fill="#E6FBFF"></circle></svg></div>' +
          '<div class="wb-layer wb-sat"><svg width="330" height="330" viewBox="0 0 330 330"><circle cx="165" cy="39" r="4.5" fill="#2F6BFF"></circle></svg></div>' +
          '<div class="wb-mark"></div>' +
        '</div>' +
        '<div class="wb-greeting wb-in"></div>' +
        '<div class="wb-title wb-in">Bem-vindo de volta</div>' +
        '<div class="wb-chip wb-in"><div class="wb-initial"></div><div class="wb-name"></div><div class="wb-dot"></div><div class="wb-lic">TV licenciada</div></div>' +
        '<div class="wb-status wb-in"></div>' +
        '<div class="wb-counts wb-in"></div>' +
        '<div class="wb-steps wb-in"><div></div><div></div><div></div></div>' +
      '</div>' +
      '<div class="wb-tip"><span class="wb-tip-b">Dica · </span><span class="wb-tip-t"></span></div>' });
    var q = function (c) { return box.querySelector('.' + c); };
    this.progress = q('wb-progress');
    this.greetingEl = q('wb-greeting');
    this.initialEl = q('wb-initial');
    this.nameEl = q('wb-name');
    this.statusEl = q('wb-status');
    this.countsEl = q('wb-counts');
    this.stepsEl = q('wb-steps').children;
    this.tipEl = box.querySelector('.wb-tip');
    this.tipText = q('wb-tip-t');
    this.active = false;
    this.step = -1;
  }

  /* Abre a tela (uma vez por abertura do app). */
  WelcomeView.prototype.start = function (name) {
    var self = this;
    name = String(name || '').replace(/^\s+|\s+$/g, '') || 'Minha lista';
    this.greetingEl.textContent = greeting();
    this.initialEl.textContent = name.charAt(0).toUpperCase();
    this.nameEl.textContent = name;
    this.countsEl.textContent = '';
    this.root.className = this.root.className.replace(/\s*wb-out/g, '');
    this.active = true;
    this.step = -1;
    this.setStep(0);
    this.tipIndex = -1;
    this.nextTip();
    clearInterval(this.tipTimer);
    this.tipTimer = setInterval(function () { self.nextTip(); }, 4000);
    clearTimeout(this.guard);
    this.guard = setTimeout(function () { if (self.active && self.onTimeout) self.onTimeout(); }, MAX_MS);
    S.show(this.root, true);
  };

  WelcomeView.prototype.nextTip = function () {
    var el = this.tipEl;
    this.tipIndex = (this.tipIndex + 1) % TIPS.length;
    this.tipText.textContent = TIPS[this.tipIndex];
    el.className = 'wb-tip';
    void el.offsetWidth; // reinicia a animação de entrada da dica
    el.className = 'wb-tip wb-tip-in';
  };

  /* 0 licença, 1 servidor, 2 catálogo, 3 pronto. Só avança. */
  WelcomeView.prototype.setStep = function (step) {
    if (!this.active || step <= this.step) return;
    this.step = step;
    var fill = [0.12, 0.38, 0.7, 1][step];
    this.progress.setAttribute('stroke-dashoffset', (C * (1 - fill)).toFixed(1));
    this.statusEl.textContent = LABELS[step];
    for (var i = 0; i < 3; i++) this.stepsEl[i].className = i < step ? 'wb-done' : i === step ? 'wb-now' : '';
  };

  /* Catálogo pronto: mostra os totais, "Tudo pronto" e esmaece (done ao fim). */
  WelcomeView.prototype.finish = function (counts, done) {
    var self = this;
    if (!this.active) { if (done) done(); return; }
    this.setStep(3);
    if (counts) this.countsEl.textContent = counts;
    setTimeout(function () {
      self.root.className += ' wb-out';
      if (done) done();
      setTimeout(function () { self.hide(); }, 650);
    }, 700);
  };

  WelcomeView.prototype.hide = function () {
    this.active = false;
    clearInterval(this.tipTimer);
    clearTimeout(this.guard);
    S.show(this.root, false);
  };

  WelcomeView.prototype.isVisible = function () { return this.active && S.isVisible(this.root); };
  WelcomeView.greeting = greeting;
  EP.WelcomeView = WelcomeView;
}(window.EP));
