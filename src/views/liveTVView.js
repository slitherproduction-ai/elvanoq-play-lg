/* TV ao Vivo — LiveTVView do ELVANOQ Play Roku 0.1.88 (mesma geometria):
 * categorias (450x830, 14 linhas), canais (690x830, 14 linhas com logotipo e
 * coração de favorito), prévia 612x344 com áudio e guia de programação.
 * Lista Xtream: "Favoritos" + categorias; os canais chegam por categoria.
 * 1.1.3 (paridade Android/Roku 1.1.1): campos "Pesquisar categoria" e
 * "Pesquisar canais" no topo de cada coluna; as linhas descem 64 px.
 */
(function (EP) {
  'use strict';
  var S = EP.Stage, LS = EP.LocalState, P = EP.Parental, G = EP.EpgRules;
  var ROWS = 13, ROW_Y = 300, STRIDE = 52;
  var SEARCH_Y = 232, SEARCH_H = 54;

  /* Sem diferenciar maiúsculas nem acentos ("noticias" acha "Notícias"). */
  var ACCENTS = { 'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'é': 'e', 'ê': 'e', 'è': 'e', 'ë': 'e', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n' };
  function fold(text) { return EP.lower(text).replace(/[áàâãäéêèëíìîïóòôõöúùûüçñ]/g, function (c) { return ACCENTS[c]; }); }
  function contains(text, needle) { return fold(EP.displayTitle(text)).indexOf(needle) !== -1; }

  function searchField(root, x, w, placeholder) {
    var field = S.el(root, { x: x, y: SEARCH_Y, w: w, h: SEARCH_H, className: 'live-search' });
    field.innerHTML = '<span class="ls-icon">' + EP.iconSvg('search') + '</span><span class="ls-text"></span>';
    field.placeholder = placeholder;
    return field;
  }

  function LiveTVView(parent, epg) {
    var root = this.root = S.group(parent, { className: 'layer' });
    var self = this;
    this.events = new EP.Emitter();
    this.epg = epg;
    S.rect(root, { x: 0, y: 0, w: 1920, h: 1080, color: '0x070B14FF' });
    S.label(root, { x: 64, y: 64, w: 700, h: 52, text: 'TV ao Vivo', size: 40, weight: 700, css: 'letter-spacing:-0.02em' });
    this.subtitle = S.label(root, { x: 64, y: 118, w: 1100, h: 28, text: 'Categorias e canais da sua lista   •   Suba até o campo para pesquisar', size: 20, color: '0x8894A8FF' });

    S.el(root, { x: 64, y: 176, w: 450, h: 830, className: 'panel', css: 'background:#0d1422' });
    S.label(root, { x: 92, y: 196, w: 300, h: 26, text: 'CATEGORIAS', size: 18, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.08em' });
    this.categoryFocus = S.el(root, { x: 76, y: ROW_Y, w: 426, h: 46, visible: false, css: 'border-radius:12px;background:#147dff;box-shadow:0 0 0 3px #00d7ff' });
    S.el(root, { x: 534, y: 176, w: 690, h: 830, className: 'panel', css: 'background:#0d1422' });
    this.channelsTitle = S.label(root, { x: 562, y: 196, w: 300, h: 26, text: 'CANAIS', size: 18, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.08em' });
    this.channelCount = S.label(root, { x: 862, y: 197, w: 338, h: 26, size: 18, align: 'right', color: '0x8894A8FF' });
    this.catSearch = searchField(root, 76, 426, 'Pesquisar categoria');
    this.chSearch = searchField(root, 546, 666, 'Pesquisar canais');
    this.catSearch.addEventListener('click', function () { self.focusColumn = 'catSearch'; self.updateFocus(); self.requestSearch('categories'); });
    this.chSearch.addEventListener('click', function () { self.focusColumn = 'chSearch'; self.updateFocus(); self.requestSearch('channels'); });
    this.channelFocus = S.el(root, { x: 546, y: ROW_Y, w: 666, h: 46, css: 'border-radius:12px;background:#147dff' });
    this.catLabels = []; this.chLabels = []; this.logos = []; this.hearts = [];
    for (var i = 0; i < ROWS; i++) {
      var y = ROW_Y + i * STRIDE;
      var cat = S.label(root, { x: 92, y: y + 6, w: 394, h: 34, size: 22, color: '0x8894A8FF' });
      var logo = S.poster(root, { x: 558, y: y + 5, w: 36, h: 36, mode: 'fit' });
      var heart = S.el(root, { x: 606, y: y + 11, w: 24, h: 24, visible: false, css: 'color:#ff5c72' });
      heart.appendChild(EP.icon('heart', 24));
      var ch = S.label(root, { x: 640, y: y + 6, w: 560, h: 34, size: 22, weight: 500 });
      (function (row) {
        cat.addEventListener('click', function () { self.focusColumn = 'categories'; self.moveCategory(self.categoryOffset + row - self.selectedCategoryIndex); self.updateFocus(); });
        ch.addEventListener('click', function () {
          var index = self.channelOffset + row;
          if (index >= self.visibleChannels.length) return;
          var again = self.focusColumn === 'channels' && index === self.selectedIndex;
          self.focusColumn = 'channels'; self.selectedIndex = index; self.updateSelection();
          if (again) self.openSelected(); else self.playSelected();
        });
      }(i));
      this.catLabels.push(cat); this.chLabels.push(ch); this.logos.push(logo); this.hearts.push(heart);
    }
    this.emptyState = S.label(root, { x: 562, y: 620, w: 634, h: 60, size: 20, lineHeight: 30, wrap: true, align: 'center', color: '0x8894A8FF', visible: false });

    S.el(root, { x: 1244, y: 176, w: 612, h: 344, css: 'border-radius:18px;background:#000;overflow:hidden' });
    this.preview = document.createElement('video');
    this.preview.className = 'sg-video';
    this.preview.setAttribute('playsinline', '');
    this.preview.style.cssText = 'left:1244px;top:176px;width:612px;height:344px;border-radius:18px';
    root.appendChild(this.preview);
    this.previewIcon = S.el(root, { x: 1510, y: 308, w: 80, h: 80, css: 'color:rgba(244,248,255,0.35)' });
    this.previewIcon.appendChild(EP.icon('live', 80));
    this.liveBadge = S.el(root, { x: 1264, y: 196, w: 110, h: 34, visible: false, text: 'AO VIVO', css: 'border-radius:8px;background:#ff5c72;color:#fff;font-size:17px;font-weight:700;letter-spacing:0.1em;line-height:34px;text-align:center' });
    this.previewTitle = S.label(root, { x: 1244, y: 540, w: 612, h: 36, text: 'Selecione um canal', size: 26, weight: 600 });
    this.previewHint = S.label(root, { x: 1244, y: 578, w: 612, h: 28, text: '→ prévia   •   OK tela cheia   •   ' + EP.OPTIONS_LABEL + ' favorito', size: 20, color: '0x8894A8FF' });

    S.el(root, { x: 1244, y: 628, w: 612, h: 378, className: 'panel', css: 'background:#0d1422' });
    S.label(root, { x: 1272, y: 650, w: 556, h: 26, text: 'GUIA DE PROGRAMAÇÃO', size: 18, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.08em' });
    this.epgNow = S.label(root, { x: 1272, y: 690, w: 556, h: 64, text: 'Carregando guia…', size: 24, weight: 500, lineHeight: 32, lines: 2 });
    this.epgTrack = S.el(root, { x: 1272, y: 766, w: 556, h: 4, css: 'border-radius:2px;background:rgba(244,248,255,0.12)' });
    this.epgProgress = S.el(root, { x: 1272, y: 766, w: 0, h: 4, css: 'border-radius:2px;background:#00d7ff' });
    this.epgNext = S.label(root, { x: 1272, y: 788, w: 556, h: 60, text: 'A seguir: —', size: 20, lineHeight: 30, lines: 2, color: '0x8894A8FF' });

    this.allChannels = []; this.visibleChannels = []; this.categoryChannels = []; this.categories = ['Todas']; this.categoryIds = ['Todas'];
    this.allCategories = ['Todas']; this.allCategoryIds = ['Todas']; this.fixedCategories = 1;
    this.categoryQuery = ''; this.channelQuery = ''; this.noCategoryMatch = false;
    this.selectedIndex = 0; this.channelOffset = 0; this.selectedCategoryIndex = 0; this.categoryOffset = 0;
    this.focusColumn = 'channels'; this.hasFocus = false; this.previewing = false;
    this.lazy = false; this.isLoading = false; this.loadError = ''; this.favoriteChannels = []; this.loadingCategoryId = '';
    this.localState = LS.load();
    this.requestTimer = new EP.Timer(0.35, false, function () { self.requestCurrentCategory(); });
    this.preview.addEventListener('playing', function () { if (self.previewing) { S.show(self.previewIcon, false); S.show(self.liveBadge, true); EP.LiveFormat.remember(EP.LiveFormat.formatOf(self.preview.src)); } });
    this.preview.addEventListener('error', function () { if (self.previewing) { self.previewHint.textContent = 'Não foi possível iniciar a prévia deste canal.'; } });
  }

  LiveTVView.prototype.show = function (visible) { S.show(this.root, visible); };
  LiveTVView.prototype.setContentFocus = function (focused) { this.hasFocus = focused; this.updateFocus(); };
  LiveTVView.prototype.setEpg = function () { this.updateSelection(); };

  LiveTVView.prototype.setCatalog = function (payload) {
    if (!payload) return;
    this.localState = LS.load();
    if (payload.lazy) { this.setLazyCatalog(payload); return; }
    this.lazy = false;
    this.allChannels = [];
    for (var i = 0; i < payload.items.length; i++) if (!payload.items[i].type || payload.items[i].type === 'live') this.allChannels.push(payload.items[i]);
    this.allCategories = ['Todas', 'Favoritos'].concat((payload.categories || []).filter(function (c) { return !!c; }));
    this.allCategoryIds = this.allCategories.slice(); // M3U: a categoria é o próprio nome
    this.fixedCategories = 2;
    this.selectedCategoryIndex = 0; this.categoryOffset = 0;
    this.filterCategories(false);
    this.applyCategory();
  };

  LiveTVView.prototype.setLazyCatalog = function (payload) {
    this.favoriteChannels = payload.favorites || [];
    var categories = payload.liveCategories || [];
    var signature = categories.length + (categories.length ? ':' + categories[0].id + ':' + categories[categories.length - 1].id : '');
    if (this.lazy && this.lazySignature === signature) {
      if (this.selectedCategoryIndex === 0) this.applyCategory(); else this.renderGuide();
      return;
    }
    this.lazy = true; this.lazySignature = signature;
    this.allCategories = ['Favoritos']; this.allCategoryIds = [''];
    for (var i = 0; i < categories.length; i++) { this.allCategories.push(categories[i].name); this.allCategoryIds.push(categories[i].id); }
    this.fixedCategories = 1;
    this.selectedCategoryIndex = 0;
    this.filterCategories(false);
    if (this.favoriteCount() === 0 && this.categories.length > 1) this.selectedCategoryIndex = 1;
    this.categoryOffset = 0; this.loadingCategoryId = '';
    this.applyCategory();
    this.requestCurrentCategory();
  };

  LiveTVView.prototype.requestCurrentCategory = function () {
    if (!this.lazy || this.selectedCategoryIndex === 0) return;
    var id = this.categoryIds[this.selectedCategoryIndex];
    if (this.loadingCategoryId === id) return;
    this.loadingCategoryId = id;
    this.events.emit('categoryRequested', { kind: 'live', id: id, name: this.categories[this.selectedCategoryIndex] });
  };

  LiveTVView.prototype.setCategoryItems = function (payload) {
    if (!this.lazy || !payload || this.selectedCategoryIndex === 0 || payload.id !== this.categoryIds[this.selectedCategoryIndex]) return;
    this.categoryChannels = payload.items || [];
    this.loadError = payload.error || '';
    this.selectedIndex = 0; this.channelOffset = 0; this.isLoading = false;
    this.filterChannels(false); // o filtro de canais vale também para o que chega
    this.renderGuide();
  };

  LiveTVView.prototype.favoriteCount = function () {
    var source = this.lazy ? this.favoriteChannels : this.allChannels, n = 0;
    for (var i = 0; i < source.length; i++) if (this.isFavorite(source[i].id)) n++;
    return n;
  };

  /* ---------- busca de categorias e canais ----------
   * Um laço só sobre a lista em memória; "Todas"/"Favoritos" ficam no topo.
   * keepOpen: mantém a categoria aberta se ela continua na lista filtrada;
   * senão abre a primeira encontrada (que não seja Todas/Favoritos). */
  LiveTVView.prototype.filterCategories = function (keepOpen) {
    var openId = this.categoryIds[this.selectedCategoryIndex], needle = fold(this.categoryQuery);
    var names = [], ids = [];
    for (var i = 0; i < this.allCategories.length; i++) {
      if (i >= this.fixedCategories && needle && !contains(this.allCategories[i], needle)) continue;
      names.push(this.allCategories[i]); ids.push(this.allCategoryIds[i]);
    }
    this.categories = names; this.categoryIds = ids;
    this.noCategoryMatch = !!needle && names.length <= this.fixedCategories;
    if (!keepOpen) { this.categoryOffset = 0; return false; }
    var at = ids.indexOf(openId);
    if (at >= 0) {
      this.selectedCategoryIndex = at;
      if (at < this.categoryOffset || at >= this.categoryOffset + ROWS) this.categoryOffset = Math.max(0, at - ROWS + 1);
      if (this.categoryOffset > at) this.categoryOffset = at;
      return false; // mesma categoria aberta, nada a recarregar
    }
    this.categoryOffset = 0;
    this.selectedCategoryIndex = names.length > this.fixedCategories ? this.fixedCategories : 0;
    return true; // a categoria aberta saiu: abrir outra
  };

  LiveTVView.prototype.filterChannels = function (keepSelection) {
    var source = this.categoryChannels, needle = fold(this.channelQuery);
    var selectedId = keepSelection && this.visibleChannels[this.selectedIndex] ? this.visibleChannels[this.selectedIndex].id : '';
    if (!needle) this.visibleChannels = source;
    else {
      var out = [];
      for (var i = 0; i < source.length; i++) {
        var ch = source[i];
        if (contains(ch.title, needle)) { out.push(ch); continue; }
        var now = this.epg.guideFor(ch).now; // só se o guia já estiver carregado
        if (now && contains(now.title, needle)) out.push(ch);
      }
      this.visibleChannels = out;
    }
    this.selectedIndex = 0; this.channelOffset = 0;
    if (selectedId) {
      for (var j = 0; j < this.visibleChannels.length; j++) if (this.visibleChannels[j].id === selectedId) { this.selectedIndex = j; break; }
      if (this.selectedIndex >= ROWS) this.channelOffset = this.selectedIndex - ROWS + 1;
    }
  };

  LiveTVView.prototype.requestSearch = function (field) {
    this.events.emit('searchRequested', { field: field, text: field === 'categories' ? this.categoryQuery : this.channelQuery });
  };

  LiveTVView.prototype.setCategoryQuery = function (text) {
    this.categoryQuery = EP.text(text);
    if (this.filterCategories(true)) { this.stopPreview(); this.applyCategory(); } else this.renderGuide();
  };

  LiveTVView.prototype.setChannelQuery = function (text) {
    this.channelQuery = EP.text(text);
    this.filterChannels(true); // sem parar a prévia
    this.renderGuide();
  };

  LiveTVView.prototype.applyCategory = function () {
    var i;
    this.visibleChannels = []; this.categoryChannels = [];
    this.selectedIndex = 0; this.channelOffset = 0; this.loadError = '';
    if (this.lazy) {
      if (this.selectedCategoryIndex === 0) {
        this.isLoading = false;
        for (i = 0; i < this.favoriteChannels.length; i++) if (this.isFavorite(this.favoriteChannels[i].id)) this.categoryChannels.push(this.favoriteChannels[i]);
        this.filterChannels(false);
      } else {
        this.isLoading = true;
        this.loadingCategoryId = '';
        this.requestTimer.start();
      }
      this.renderGuide();
      return;
    }
    var selected = this.categories[this.selectedCategoryIndex];
    for (i = 0; i < this.allChannels.length; i++) {
      var ch = this.allChannels[i];
      if (selected === 'Todas' || ch.category === selected || (selected === 'Favoritos' && this.isFavorite(ch.id))) this.categoryChannels.push(ch);
    }
    this.filterChannels(false);
    this.renderGuide();
  };

  LiveTVView.prototype.renderGuide = function () {
    var i;
    for (i = 0; i < ROWS; i++) {
      var ci = this.categoryOffset + i;
      var empty = this.noCategoryMatch && ci === this.categories.length;
      this.catLabels[i].textContent = ci < this.categories.length ? this.categories[ci] : (empty ? 'Nenhuma categoria encontrada' : '');
      this.catLabels[i].style.color = ci === this.selectedCategoryIndex ? '#f4f8ff' : (empty ? '#63728a' : '#8894a8');
      this.catLabels[i].style.fontWeight = ci === this.selectedCategoryIndex ? '600' : '400';
    }
    this.renderSearchFields();
    var total = this.categoryChannels.length, shown = this.visibleChannels.length;
    this.channelCount.textContent = this.channelQuery ? EP.formatNumber(shown) + ' de ' + EP.formatNumber(total) : (total ? EP.formatNumber(total) + (total === 1 ? ' canal' : ' canais') : '');
    if (!this.visibleChannels.length) {
      var text = 'Nenhum canal nesta categoria.';
      if (this.channelQuery && total) text = 'Nenhum canal encontrado para "' + this.channelQuery + '" nesta categoria.';
      if (this.lazy && this.isLoading) text = 'Carregando canais…';
      else if (this.lazy && this.loadError) text = this.loadError;
      else if (!this.channelQuery && this.categories[this.selectedCategoryIndex] === 'Favoritos') text = 'Nenhum favorito ainda. Aperte ' + EP.OPTIONS_LABEL + ' em um canal para favoritar.';
      this.emptyState.textContent = text;
      S.show(this.emptyState, true);
      for (i = 0; i < ROWS; i++) { this.chLabels[i].textContent = ''; S.show(this.logos[i], false); S.show(this.hearts[i], false); }
      this.previewTitle.textContent = ''; this.epgNow.textContent = ''; this.epgNext.textContent = ''; this.epgProgress.style.width = '0';
      this.updateFocus();
      return;
    }
    S.show(this.emptyState, false);
    for (i = 0; i < ROWS; i++) {
      var ch = this.visibleChannels[this.channelOffset + i];
      this.chLabels[i].textContent = ch ? EP.displayTitle(ch.title) : '';
      S.show(this.hearts[i], !!ch && this.isFavorite(ch.id));
      if (ch && ch.logo) { S.setPoster(this.logos[i], ch.logo); S.show(this.logos[i], true); } else S.show(this.logos[i], false);
    }
    this.updateSelection();
  };

  LiveTVView.prototype.moveChannel = function (delta) {
    if (this.focusColumn === 'categories') { this.moveCategory(delta); return; }
    if (!this.visibleChannels.length) return;
    var next = Math.max(0, Math.min(this.visibleChannels.length - 1, this.selectedIndex + delta));
    this.selectedIndex = next;
    if (next < this.channelOffset) { this.channelOffset = next; this.renderGuide(); }
    else if (next >= this.channelOffset + ROWS) { this.channelOffset = next - (ROWS - 1); this.renderGuide(); }
    else this.updateSelection();
  };

  LiveTVView.prototype.moveCategory = function (delta) {
    var next = Math.max(0, Math.min(this.categories.length - 1, this.selectedCategoryIndex + delta));
    if (next === this.selectedCategoryIndex) return;
    this.selectedCategoryIndex = next;
    if (next < this.categoryOffset) this.categoryOffset = next;
    else if (next >= this.categoryOffset + ROWS) this.categoryOffset = next - (ROWS - 1);
    this.stopPreview();
    this.applyCategory();
  };

  LiveTVView.prototype.renderSearchFields = function () {
    var fields = [[this.catSearch, this.categoryQuery, 'catSearch'], [this.chSearch, this.channelQuery, 'chSearch']];
    for (var i = 0; i < 2; i++) {
      var f = fields[i][0], text = fields[i][1];
      f.children[1].textContent = text || f.placeholder;
      S.toggle(f, 'filled', !!text);
      S.toggle(f, 'focused', this.hasFocus && this.focusColumn === fields[i][2]);
    }
  };

  LiveTVView.prototype.handleKey = function (key) {
    var col = this.focusColumn;
    if (col === 'catSearch' || col === 'chSearch') {
      // No campo: ▼ volta à lista, ◀/▶ trocam de campo, OK abre o teclado.
      if (key === 'down') this.focusColumn = col === 'catSearch' ? 'categories' : 'channels';
      else if (key === 'left' || key === 'right') this.focusColumn = col === 'catSearch' ? 'chSearch' : 'catSearch';
      else if (key === 'OK') this.requestSearch(col === 'catSearch' ? 'categories' : 'channels');
      this.updateFocus();
      return true; // ▲ fica no campo (na LG não há menu de seções; Voltar vai à Início)
    }
    if (key === 'up' && col === 'categories' && this.selectedCategoryIndex === 0) { this.focusColumn = 'catSearch'; this.updateFocus(); return true; }
    if (key === 'up' && col === 'channels' && this.selectedIndex === 0) { this.focusColumn = 'chSearch'; this.updateFocus(); return true; }
    if (key === 'down' || key === 'channelDown') { this.moveChannel(key === 'down' ? 1 : ROWS); return true; }
    if (key === 'up' || key === 'channelUp') { this.moveChannel(key === 'up' ? -1 : -ROWS); return true; }
    if (key === 'left') { this.focusColumn = 'categories'; this.updateFocus(); return true; }
    if (key === 'right') { if (this.focusColumn === 'categories') { this.focusColumn = 'channels'; this.updateFocus(); } else this.playSelected(); return true; }
    if (key === 'OK') { if (this.focusColumn === 'categories') { this.focusColumn = 'channels'; this.updateFocus(); } else this.openSelected(); return true; }
    if (key === 'options') {
      var current = this.visibleChannels[this.selectedIndex];
      // Canal com arquivo: AZUL abre as opções (favorito + rever programas).
      if (current && current.archive_days > 0) this.events.emit('optionsRequested', { item: current });
      else this.toggleFavorite();
      return true;
    }
    return true;
  };

  LiveTVView.prototype.updateFocus = function () {
    this.renderSearchFields();
    S.show(this.categoryFocus, this.focusColumn === 'categories' && this.hasFocus);
    // Com o foco num campo de busca, o foco da linha fica oculto.
    S.show(this.channelFocus, this.focusColumn === 'channels' && this.visibleChannels.length > 0);
    this.channelFocus.style.boxShadow = this.hasFocus ? '0 0 0 3px #00d7ff' : 'none';
    S.move(this.categoryFocus, 76, ROW_Y + Math.max(0, Math.min(ROWS - 1, this.selectedCategoryIndex - this.categoryOffset)) * STRIDE);
    S.move(this.channelFocus, 546, ROW_Y + Math.max(0, Math.min(ROWS - 1, this.selectedIndex - this.channelOffset)) * STRIDE);
    for (var i = 0; i < ROWS; i++) {
      var catSelected = this.categoryOffset + i === this.selectedCategoryIndex && this.focusColumn === 'categories' && this.hasFocus;
      if (catSelected) this.catLabels[i].style.color = '#ffffff';
    }
  };

  LiveTVView.prototype.updateSelection = function () {
    this.updateFocus();
    if (!this.visibleChannels.length) return;
    var self = this, selected = this.visibleChannels[this.selectedIndex];
    this.previewTitle.textContent = EP.displayTitle(selected.title);
    if (!this.previewing) this.previewHint.textContent = '→ prévia   •   OK tela cheia   •   ' + EP.OPTIONS_LABEL + (selected.archive_days > 0 ? ' opções e rever programas' : ' favorito');
    var guide = this.epg.guideFor(selected);
    if (guide.now) {
      this.epgNow.textContent = G.programmeLabel(guide.now);
      this.epgProgress.style.width = Math.round(556 * G.progress(guide.now)) + 'px';
      this.epgNext.textContent = 'A seguir: ' + (guide.next ? G.programmeLabel(guide.next) : '—');
    } else {
      this.epgNow.textContent = this.epg.source && this.epg.source.kind === 'xtream' ? 'Carregando guia…' : 'Programação indisponível para este canal.';
      this.epgProgress.style.width = '0';
      this.epgNext.textContent = 'A seguir: —';
      clearTimeout(this.epgTimer);
      this.epgTimer = setTimeout(function () {
        self.epg.request(selected, function (item) {
          var current = self.visibleChannels[self.selectedIndex];
          if (!current || current.id !== item.id) return;
          if (!self.epg.guideFor(item).now) self.epgNow.textContent = 'Programação indisponível para este canal.';
          else self.updateSelection();
        });
      }, 700);
    }
  };

  LiveTVView.prototype.playSelected = function () {
    if (!this.visibleChannels.length) return;
    var selected = this.visibleChannels[this.selectedIndex];
    if (P.isBlockedItem(selected.category, selected.id)) { this.previewHint.textContent = 'Conteúdo protegido. Valide o PIN em Ajustes para continuar.'; return; }
    this.previewing = true;
    this.preview.src = EP.LiveFormat.apply(selected.stream_url);
    var attempt = this.preview.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
    this.previewHint.textContent = 'Prévia em execução   •   OK para assistir em tela cheia';
  };

  LiveTVView.prototype.openSelected = function () {
    if (!this.visibleChannels.length) return;
    var selected = this.visibleChannels[this.selectedIndex];
    if (P.isBlockedItem(selected.category, selected.id)) { this.previewHint.textContent = 'Conteúdo protegido. Valide o PIN em Ajustes para continuar.'; return; }
    this.stopPreview();
    this.events.emit('playRequested', { item: selected, channels: this.visibleChannels, index: this.selectedIndex });
  };

  LiveTVView.prototype.toggleFavorite = function () {
    if (!this.visibleChannels.length) return;
    var selected = this.visibleChannels[this.selectedIndex];
    var added = LS.toggle('favorites', selected);
    this.localState = LS.load();
    if (this.lazy && added && !EP.find(this.favoriteChannels, function (c) { return c.id === selected.id; })) this.favoriteChannels.push(selected);
    this.renderGuide();
  };

  LiveTVView.prototype.isFavorite = function (id) { return LS.contains(this.localState.favorites, id); };

  /* Descarrega o decodificador: na LG só há um pipeline de vídeo confiável. */
  LiveTVView.prototype.stopPreview = function () {
    var was = this.previewing;
    this.previewing = false;
    try { this.preview.pause(); } catch (_) {}
    if (this.preview.getAttribute('src')) { this.preview.removeAttribute('src'); try { this.preview.load(); } catch (_) {} }
    S.show(this.previewIcon, true); S.show(this.liveBadge, false);
    if (was) this.updateSelection();
  };

  EP.LiveTVView = LiveTVView;
}(window.EP));
