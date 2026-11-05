/* TV ao Vivo — LiveTVView do ELVANOQ Play Roku 0.1.88 (mesma geometria):
 * categorias (450x830, 14 linhas), canais (690x830, 14 linhas com logotipo e
 * coração de favorito), prévia 612x344 com áudio e guia de programação.
 * Lista Xtream: "Favoritos" + categorias; os canais chegam por categoria.
 */
(function (EP) {
  'use strict';
  var S = EP.Stage, LS = EP.LocalState, P = EP.Parental, G = EP.EpgRules;
  var ROWS = 14, ROW_Y = 236, STRIDE = 52;

  function LiveTVView(parent, epg) {
    var root = this.root = S.group(parent, { className: 'layer' });
    var self = this;
    this.events = new EP.Emitter();
    this.epg = epg;
    S.rect(root, { x: 0, y: 0, w: 1920, h: 1080, color: '0x070B14FF' });
    S.label(root, { x: 64, y: 64, w: 700, h: 52, text: 'TV ao Vivo', size: 40, weight: 700, css: 'letter-spacing:-0.02em' });
    this.subtitle = S.label(root, { x: 64, y: 118, w: 900, h: 28, text: 'Categorias e canais da sua lista', size: 20, color: '0x8894A8FF' });

    S.el(root, { x: 64, y: 176, w: 450, h: 830, className: 'panel', css: 'background:#0d1422' });
    S.label(root, { x: 92, y: 196, w: 300, h: 26, text: 'CATEGORIAS', size: 18, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.08em' });
    this.categoryFocus = S.el(root, { x: 76, y: ROW_Y, w: 426, h: 46, visible: false, css: 'border-radius:12px;background:#147dff;box-shadow:0 0 0 3px #00d7ff' });
    S.el(root, { x: 534, y: 176, w: 690, h: 830, className: 'panel', css: 'background:#0d1422' });
    this.channelsTitle = S.label(root, { x: 562, y: 196, w: 640, h: 26, text: 'CANAIS', size: 18, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.08em' });
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
    this.emptyState = S.label(root, { x: 562, y: 600, w: 634, h: 60, size: 20, lineHeight: 30, wrap: true, align: 'center', color: '0x8894A8FF', visible: false });

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

    this.allChannels = []; this.visibleChannels = []; this.categories = ['Todas']; this.categoryIds = [];
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
    this.categories = ['Todas', 'Favoritos'].concat((payload.categories || []).filter(function (c) { return !!c; }));
    this.subtitle.textContent = EP.formatNumber(this.allChannels.length) + ' canais   •   ' + EP.formatNumber(this.categories.length - 2) + ' categorias';
    this.selectedCategoryIndex = 0; this.categoryOffset = 0;
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
    this.categories = ['Favoritos']; this.categoryIds = [''];
    for (var i = 0; i < categories.length; i++) { this.categories.push(categories[i].name); this.categoryIds.push(categories[i].id); }
    this.subtitle.textContent = EP.formatNumber(categories.length) + ' categorias';
    this.selectedCategoryIndex = this.favoriteCount() === 0 && this.categories.length > 1 ? 1 : 0;
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
    this.visibleChannels = payload.items || [];
    this.loadError = payload.error || '';
    this.selectedIndex = 0; this.channelOffset = 0; this.isLoading = false;
    this.renderGuide();
  };

  LiveTVView.prototype.favoriteCount = function () {
    var source = this.lazy ? this.favoriteChannels : this.allChannels, n = 0;
    for (var i = 0; i < source.length; i++) if (this.isFavorite(source[i].id)) n++;
    return n;
  };

  LiveTVView.prototype.applyCategory = function () {
    var i;
    this.visibleChannels = [];
    this.selectedIndex = 0; this.channelOffset = 0; this.loadError = '';
    if (this.lazy) {
      if (this.selectedCategoryIndex === 0) {
        this.isLoading = false;
        for (i = 0; i < this.favoriteChannels.length; i++) if (this.isFavorite(this.favoriteChannels[i].id)) this.visibleChannels.push(this.favoriteChannels[i]);
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
      if (selected === 'Todas' || ch.category === selected || (selected === 'Favoritos' && this.isFavorite(ch.id))) this.visibleChannels.push(ch);
    }
    this.renderGuide();
  };

  LiveTVView.prototype.renderGuide = function () {
    var i;
    for (i = 0; i < ROWS; i++) {
      var ci = this.categoryOffset + i;
      this.catLabels[i].textContent = ci < this.categories.length ? this.categories[ci] : '';
      this.catLabels[i].style.color = ci === this.selectedCategoryIndex ? '#f4f8ff' : '#8894a8';
      this.catLabels[i].style.fontWeight = ci === this.selectedCategoryIndex ? '600' : '400';
    }
    this.channelsTitle.textContent = 'CANAIS' + (this.visibleChannels.length ? '   •   ' + EP.formatNumber(this.visibleChannels.length) : '');
    if (!this.visibleChannels.length) {
      var text = 'Nenhum canal nesta categoria.';
      if (this.lazy && this.isLoading) text = 'Carregando canais…';
      else if (this.lazy && this.loadError) text = this.loadError;
      else if (this.categories[this.selectedCategoryIndex] === 'Favoritos') text = 'Nenhum favorito ainda. Aperte ' + EP.OPTIONS_LABEL + ' em um canal para favoritar.';
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

  LiveTVView.prototype.handleKey = function (key) {
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
    S.show(this.categoryFocus, this.focusColumn === 'categories' && this.hasFocus);
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
