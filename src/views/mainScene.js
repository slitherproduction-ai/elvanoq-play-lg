/* Porta de components/MainScene.xml + MainScene.brs: tela de ativação
 * (mesmo layout do Roku) e ciclo de vida da licença.
 *
 * Diferenças obrigatórias do webOS, preservadas da versão 0.4.0:
 *  - consentimento explícito antes de consultar o LGUDID;
 *  - o Portal recebe só o SHA-256 da identidade e uma chave numérica local;
 *  - a tela mostra o código da TV, usado em elvanoqplay.app (1.1.1: a chave
 *    deixou de aparecer; o Portal vincula pelo código).
 */
(function (EP) {
  'use strict';
  var S = EP.Stage, Portal = EP.Portal;
  var PENDING_POLL = 30, ACTIVE_POLL = 300; // segundos (Portal: 60 consultas / 15 min)

  function MainScene(stage) {
    var self = this;
    this.stage = stage;
    // 1.1.1: mesmo padrão da tela de login do Android 2.17.23 (activation-
    // chooser): logo com slogan, relógio, 3 passos, código em destaque, botão
    // branco "Entrar com código do servidor", atalhos, QR e rodapé com status.
    var root = this.activation = S.group(stage, { className: 'layer' });
    S.rect(root, { x: 0, y: 0, w: 1920, h: 1080, color: '0x070B14FF' });
    S.poster(root, { x: 0, y: 0, w: 1920, h: 1080, uri: 'images/elvanoq-login-tv-backdrop.jpg' });
    S.el(root, { x: 0, y: 0, w: 1920, h: 1080, css: 'background:linear-gradient(90deg,rgba(7,11,20,0.96) 0%,rgba(7,11,20,0.88) 38%,rgba(7,11,20,0.35) 70%,rgba(7,11,20,0) 100%)' });
    S.poster(root, { x: 112, y: 72, w: 400, h: 97, uri: 'images/elvanoq-logo-tagline.png', mode: 'fit' }).style.backgroundPosition = 'left center';
    this.clockTime = S.label(root, { x: 1444, y: 72, w: 364, h: 54, size: 46, weight: 600, align: 'right' });
    this.clockDate = S.label(root, { x: 1444, y: 128, w: 364, h: 30, size: 22, align: 'right', color: '0x8894A8FF' });
    S.label(root, { x: 112, y: 240, w: 900, h: 26, text: 'ACESSO SEGURO', size: 19, weight: 700, color: '0x00D7FFFF', css: 'letter-spacing:0.17em' });
    this.headline = S.label(root, { x: 112, y: 270, w: 1000, h: 80, text: 'Ative sua TV', size: 66, weight: 700, css: 'letter-spacing:-0.026em' });
    this.description = S.label(root, { x: 112, y: 350, w: 1000, h: 38, size: 27, color: '0xB8C4D6FF', text: 'Vincule esta TV ao Portal ELVANOQ Play em três passos.' });
    var steps = ['Acesse elvanoqplay.app ou aponte a câmera para o QR code', 'Informe o código desta TV', 'A TV ativa sozinha em alguns segundos'];
    for (var i = 0; i < 3; i++) {
      S.el(root, { x: 112, y: 408 + i * 58, w: 45, h: 45, text: String(i + 1), css: 'border-radius:23px;background:#147dff;color:#fff;font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center' });
      S.label(root, { x: 175, y: 408 + i * 58, w: 900, h: 45, text: steps[i], size: 25, valign: 'center', color: '0xE4EAF4FF' });
    }
    S.label(root, { x: 112, y: 592, w: 700, h: 26, text: 'CÓDIGO DESTA TV', size: 19, weight: 700, color: '0x8E9AAEFF', css: 'letter-spacing:0.14em' });
    S.el(root, { x: 112, y: 630, w: 930, h: 130, className: 'act-code' });
    S.label(root, { x: 151, y: 656, w: 400, h: 24, text: 'CÓDIGO', size: 18, weight: 700, color: '0x8E9AAEFF', css: 'letter-spacing:0.1em' });
    this.deviceCode = S.label(root, { x: 151, y: 682, w: 860, h: 54, size: 42, weight: 700, css: 'letter-spacing:0.05em' });
    this.qrGroup = S.group(root, { className: 'layer', visible: false });
    S.el(this.qrGroup, { x: 1122, y: 574, w: 294, h: 294, css: 'background:#fff;border-radius:24px' });
    this.qrHolder = S.el(this.qrGroup, { x: 1137, y: 589, w: 264, h: 264 });
    S.label(this.qrGroup, { x: 1072, y: 884, w: 394, h: 30, text: 'Aponte a câmera do celular', size: 21, weight: 600, align: 'center', color: '0xB8C4D6FF' });
    S.label(this.qrGroup, { x: 1072, y: 920, w: 394, h: 34, text: 'elvanoqplay.app', size: 26, weight: 700, align: 'center', color: '0x00D7FFFF' });
    // Ações: botão principal e dois atalhos (foco por ↑/↓/←/→).
    this.button = S.el(root, { x: 112, y: 780, w: 930, h: 93, className: 'act-primary' });
    this.shortcuts = [
      S.el(root, { x: 112, y: 885, w: 459, h: 81, className: 'act-short' }),
      S.el(root, { x: 583, y: 885, w: 459, h: 81, className: 'act-short' })
    ];
    S.setButton(this.shortcuts[0], 'refresh', 'Verificar ativação');
    S.setButton(this.shortcuts[1], 'info', 'Como ativar');
    this.actions = [this.button, this.shortcuts[0], this.shortcuts[1]];
    this.actionIndex = 0;
    for (var k = 0; k < this.actions.length; k++) {
      (function (index) { self.actions[index].addEventListener('click', function () { self.actionIndex = index; self.updateActionFocus(); self.runAction(); }); }(k));
    }
    this.statusDot = S.el(root, { x: 112, y: 1007, w: 14, h: 14, className: 'status-dot pulse' });
    this.status = S.label(root, { x: 140, y: 994, w: 1000, h: 40, text: 'Preparando ativação…', size: 22, valign: 'center', color: '0xB8C4D6FF' });
    S.label(root, { x: 1208, y: 996, w: 600, h: 36, text: 'ELVANOQ · LG webOS · Versão ' + EP.VERSION, size: 19, align: 'right', valign: 'center', color: '0x8E9AAEFF' });
    this.updateActionFocus();
    // Aviso de teste encerrado (Roku 1.0.1): sem pagamento nem link externo.
    var ov = this.expiredOverlay = S.group(root, { className: 'layer', visible: false });
    S.rect(ov, { x: 0, y: 0, w: 1920, h: 1080, color: '0x02070DEB' });
    S.el(ov, { x: 300, y: 150, w: 1320, h: 780, css: 'border-radius:28px;background:#0b121e;border:1px solid rgba(190,220,255,0.2)' });
    S.poster(ov, { x: 810, y: 196, w: 300, h: 100, uri: 'images/elvanoq-wordmark-white.png', mode: 'fit' });
    S.label(ov, { x: 300, y: 330, w: 1320, h: 60, text: 'Seu teste gratuito terminou', size: 44, weight: 700, align: 'center' });
    S.label(ov, { x: 420, y: 400, w: 1080, h: 72, size: 24, lineHeight: 34, lines: 2, align: 'center', color: '0xB8C4D6FF', text: 'Este aparelho ainda não possui uma licença ativa. Assim que a licença for ativada, a TV libera o acesso automaticamente.' });
    S.label(ov, { x: 300, y: 506, w: 1320, h: 26, text: 'CÓDIGO DESTE APARELHO', size: 18, weight: 700, align: 'center', color: '0x8894A8FF', css: 'letter-spacing:0.12em' });
    S.el(ov, { x: 560, y: 544, w: 800, h: 104, css: 'box-sizing:border-box;border:3px solid #00d7ff;border-radius:18px;background:#0d1422' });
    this.expiredCode = S.label(ov, { x: 563, y: 547, w: 794, h: 98, size: 44, weight: 700, align: 'center', valign: 'center' });
    this.expiredInfo = S.label(ov, { x: 300, y: 672, w: 1320, h: 30, size: 20, align: 'center', color: '0x8894A8FF' });
    S.el(ov, { x: 740, y: 738, w: 440, h: 72, text: 'OK   •   Verificar agora', css: 'border-radius:28px;background:#f4f8ff;color:#070b14;font-size:24px;font-weight:600;display:flex;align-items:center;justify-content:center;white-space:pre' });
    S.label(ov, { x: 300, y: 852, w: 1320, h: 28, text: 'Voltar   •   Sair do aplicativo', size: 18, align: 'center', color: '0x8894A8FF', css: 'white-space:pre' });

    this.updateClock();
    this.clockTimer = new EP.Timer(20, true, function () { self.updateClock(); });
    this.clockTimer.start();

    this.shell = new EP.AppShell(stage, this);
    this.loading = S.el(stage, { x: 1300, y: 990, w: 560, h: 56, visible: false, css: 'display:flex;align-items:center;justify-content:center;padding:0 24px;border-radius:28px;background:rgba(17,27,45,0.92);border:1px solid rgba(190,222,255,0.16);font-size:20px;color:#c9d3e3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:40' });

    this.dialog = null;
    this.requestInFlight = false;
    this.playlistSynced = false;
    this.licenseTimer = new EP.Timer(PENDING_POLL, true, function () { self.checkLicense(); });
  }

  MainScene.prototype.start = function () {
    EP.Parental.clearSession();
    Portal.readIdentity();
    this.updateIdentity();
    if (!Portal.hasConsent()) {
      this.description.textContent = 'Para vincular, esta TV gera uma identificação protegida e criptografada.';
      this.status.textContent = 'Pressione OK para continuar.';
      return;
    }
    this.connect();
  };

  MainScene.prototype.updateIdentity = function () {
    var ready = !!Portal.identity;
    if (!ready) {
      this.deviceCode.textContent = 'Pressione OK para gerar o código';
      this.deviceCode.style.fontSize = '32px';
      S.setButton(this.button, 'key', 'Continuar e gerar identificação');
      S.show(this.qrGroup, false);
    } else {
      this.description.textContent = 'Vincule esta TV ao Portal ELVANOQ Play em três passos.';
      this.deviceCode.textContent = Portal.deviceCode();
      this.deviceCode.style.fontSize = '42px';
      S.setButton(this.button, 'key', 'Entrar com código do servidor');
      this.renderQr();
    }
    // Sem identificação ainda, "Verificar ativação" não faz sentido.
    S.show(this.shortcuts[0], ready);
    S.move(this.shortcuts[1], ready ? 583 : 112, 885, ready ? 459 : 930);
    if (!ready && this.actionIndex === 1) this.actionIndex = 0;
    this.updateActionFocus();
  };

  MainScene.prototype.updateActionFocus = function () {
    for (var i = 0; i < this.actions.length; i++) S.toggle(this.actions[i], 'focused', i === this.actionIndex);
  };

  MainScene.prototype.moveAction = function (key) {
    var ready = !!Portal.identity, i = this.actionIndex;
    if (key === 'down' && i === 0) i = ready ? 1 : 2;
    else if (key === 'up' && i > 0) i = 0;
    else if (key === 'left' && i === 2 && ready) i = 1;
    else if (key === 'right' && i === 1) i = 2;
    this.actionIndex = i;
    this.updateActionFocus();
  };

  MainScene.prototype.runAction = function () {
    if (this.actionIndex === 0) {
      if (!Portal.identity) this.giveConsent(); else this.openServerCodeKeyboard();
    } else if (this.actionIndex === 1) {
      if (!Portal.identity) return;
      this.status.textContent = 'Verificando a ativação…';
      this.setTone('connecting');
      this.checkLicense();
    } else this.openHelp();
  };

  MainScene.prototype.openHelp = function () {
    var self = this, code = Portal.identity ? Portal.deviceCode() : '';
    this.openList({
      title: 'Como ativar esta TV', subtitle: code ? 'Código desta TV: ' + code : 'Primeiro gere o código desta TV',
      items: [
        { label: '1. No celular ou computador, abra elvanoqplay.app' },
        { label: '2. Ou aponte a câmera do celular para o QR code da tela' },
        { label: '3. Informe o código desta TV e cadastre a sua lista' },
        { label: '4. A TV ativa sozinha em alguns segundos' },
        { label: 'Tem o código do seu servidor? Use "Entrar com código do servidor"' }
      ],
      onSelect: function () { self.dialog.close(); }
    });
  };

  /* QR com o código desta TV (mesma URL do Roku). Sem matriz, some o QR. */
  MainScene.prototype.renderQr = function () {
    var svg = EP.QrCode.qrSvg('https://elvanoqplay.app/adicionar-lista/?codigo=' + Portal.deviceCode(), 6, '#070b14');
    this.qrHolder.innerHTML = svg;
    S.show(this.qrGroup, !!svg);
  };

  MainScene.prototype.updateClock = function () {
    var now = new Date(), days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    var months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    this.clockTime.textContent = EP.clockText(now).time;
    this.clockDate.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()];
  };

  // Cores do ponto de status como no setStatusTone do Roku.
  MainScene.prototype.setTone = function (tone) {
    var colors = { error: '#ff5c72', waiting: '#ffb547', active: '#2ee59d', connecting: '#00d7ff' };
    this.statusDot.style.background = colors[tone] || colors.connecting;
    S.toggle(this.statusDot, 'pulse', tone !== 'error');
    this.status.style.color = tone === 'error' ? '#ffb3be' : '#f4f8ff';
  };

  MainScene.prototype.settingsInfo = function () {
    var id = Portal.identity, state = this.licenseState || 'pending';
    var labels = { active: ['Ativa', 'success'], expired: ['Expirada', 'warning'], blocked: ['Bloqueada', 'warning'], offline: ['Sem conexão', 'warning'], error: ['Indisponível', 'warning'], pending: ['Pendente', 'warning'] };
    var license = this.manualSession && state !== 'active' ? ['Acesso por código', 'success'] : (labels[state] || labels.pending);
    return {
      name: this.shell.playlistName || 'TV LG webOS',
      code: id ? Portal.deviceCode() : '', key: id ? id.key : '',
      licenseLabel: license[0], licenseTone: license[1],
      listLabel: this.shell.playlistName ? (this.shell.playlistOrigin === 'manual-code' ? 'Código do servidor' : 'Portal') : 'Nenhuma'
    };
  };

  MainScene.prototype.setLoading = function (message) {
    var self = this;
    this.loading.textContent = message || '';
    S.show(this.loading, !!message);
    clearTimeout(this.loadingTimer);
    // Mensagens finais somem sozinhas; "Carregando…" fica até concluir.
    if (message && !/…$/.test(message)) this.loadingTimer = setTimeout(function () { S.show(self.loading, false); }, 6000);
  };

  /* ---------- fluxo do Portal (registro -> licença -> lista) ---------- */
  MainScene.prototype.connect = function () {
    var self = this;
    this.status.textContent = 'Conectando ao Portal para ativação…';
    this.setTone('connecting');
    Portal.register().then(function (r) {
      if (!r.ok && r.status !== 0 && r.status !== 429) { self.showActivationState('error', r.message); return; }
      self.checkLicense();
    });
    this.licenseTimer.start();
  };

  MainScene.prototype.checkLicense = function () {
    var self = this;
    if (this.requestInFlight || !Portal.identity) return;
    this.requestInFlight = true;
    Portal.licenseStatus().then(function (r) {
      self.requestInFlight = false;
      self.showActivationState(r.state, r.message);
      if (r.state === 'active' && !self.playlistSynced) self.requestPlaylistSync(false);
    });
  };

  MainScene.prototype.requestPlaylistSync = function (manual) {
    var self = this;
    if (this.syncInFlight) return;
    this.syncInFlight = true;
    if (manual) this.setLoading('Buscando a lista salva no Portal…');
    Portal.playlistSync().then(function (r) {
      self.syncInFlight = false;
      if (r.ok && r.playlist) {
        self.playlistSynced = true;
        self.shell.applyPlaylist({ display_name: r.displayName, server_code: r.body.server_code, playlist: r.playlist });
        return;
      }
      if (r.ok && r.empty) { self.playlistSynced = true; self.setLoading('Nenhuma lista vinculada a esta TV no Portal. Adicione em elvanoqplay.app.'); return; }
      // Falha de rede/limite: usa a última lista sincronizada, sem apagar dados locais.
      var cached = Portal.portalPlaylist();
      if (cached && (r.status === 0 || r.status === 429 || r.status >= 500) && !self.playlistSynced) {
        self.playlistSynced = true;
        self.shell.applyPlaylist({ display_name: cached.name, playlist: cached });
        return;
      }
      self.setLoading(r.message || 'Falha temporária ao sincronizar. Seus dados locais foram preservados.');
    });
  };

  MainScene.prototype.showActivationState = function (state, message) {
    this.licenseState = state === 'offline' && this.licenseState === 'active' ? 'active' : state;
    if (state === 'active') {
      S.show(this.expiredOverlay, false);
      this.licenseTimer.seconds = ACTIVE_POLL; if (this.licenseTimer.running()) this.licenseTimer.start();
      this.setActivationVisible(false);
      this.shell.show(true);
      return;
    }
    if (state === 'offline' && this.shell.isVisible()) return; // mantém o app em uso sem rede
    if (state !== 'offline') S.show(this.expiredOverlay, state === 'expired');
    if (state === 'expired') {
      this.expiredCode.textContent = Portal.identity ? Portal.deviceCode() : '';
      this.expiredInfo.textContent = 'A ativação é verificada automaticamente a cada ' + PENDING_POLL + ' segundos.';
    }
    this.licenseTimer.seconds = PENDING_POLL; if (this.licenseTimer.running()) this.licenseTimer.start();
    if ((state === 'expired' || state === 'blocked') && this.shell.isVisible()) {
      this.shell.stopPlayback();
      this.shell.show(false);
    }
    if (state === 'pending' && this.shell.isVisible() && this.manualSession) return;
    this.setActivationVisible(true);
    this.setTone(state === 'pending' ? 'waiting' : state === 'offline' ? 'connecting' : 'error');
    if (state === 'expired') this.status.textContent = 'Teste gratuito encerrado. Este aparelho não possui licença ativa.';
    else if (state === 'blocked') this.status.textContent = 'Dispositivo bloqueado. Consulte o suporte no Portal.';
    else if (state === 'offline') this.status.textContent = message || 'Sem conexão. A ativação será verificada novamente.';
    else if (state === 'error') this.status.textContent = message || 'Falha ao consultar o Portal. Vamos tentar novamente.';
    else this.status.textContent = 'Aguardando ativação. Vincule esta TV em elvanoqplay.app.';
  };

  // Deep link (busca/voz da LG): guardado até o catálogo carregar.
  MainScene.prototype.setDeepLink = function (link) { this.shell.setDeepLink(link); };

  MainScene.prototype.setActivationVisible = function (visible) { S.show(this.activation, visible); };

  /* ---------- teclas ---------- */
  MainScene.prototype.handleKey = function (key, event) {
    if (this.dialog && !this.dialog.closed) return this.dialog.handleKey(key, event);
    if (this.shell.isVisible() && !S.isVisible(this.activation)) return this.shell.handleKey(key);
    // Teste encerrado: OK verifica de novo; Voltar sai do app.
    if (S.isVisible(this.expiredOverlay)) {
      if (key === 'back') return false;
      if (key === 'OK') { this.expiredInfo.textContent = 'Verificando a ativação…'; this.checkLicense(); }
      return true;
    }
    if (key === 'OK') { this.runAction(); return true; }
    if (key === 'up' || key === 'down' || key === 'left' || key === 'right') { this.moveAction(key); return true; }
    return key !== 'back';
  };

  MainScene.prototype.giveConsent = function () {
    var self = this;
    this.status.textContent = 'Gerando identificação protegida…';
    Portal.ensureIdentity().then(function () { self.updateIdentity(); self.connect(); }, function () {
      self.status.textContent = 'Não foi possível preparar a ativação desta TV. Reinicie o aplicativo.';
    });
  };

  MainScene.prototype.openList = function (opts) {
    if (this.dialog && !this.dialog.closed) this.dialog.close();
    this.dialog = new EP.ListDialog(this.stage, opts);
    return this.dialog;
  };

  MainScene.prototype.openKeyboard = function (opts) {
    if (this.dialog && !this.dialog.closed) this.dialog.close();
    this.dialog = new EP.KeyboardDialog(this.stage, opts);
    return this.dialog;
  };

  /* Login por código do servidor: código -> usuário -> senha (só em memória). */
  MainScene.prototype.openServerCodeKeyboard = function () {
    var self = this;
    this.status.textContent = 'Informe o código do servidor para continuar.';
    this.openKeyboard({
      title: 'Código do servidor', message: 'Digite o código recebido no Portal.', buttons: ['Continuar', 'Cancelar'],
      onButton: function (index, value) {
        if (index !== 0) { self.status.textContent = 'Login por código cancelado.'; return; }
        var code = String(value || '').replace(/\s/g, '').toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(code)) { self.status.textContent = 'Código inválido. Confira o código e tente novamente.'; return; }
        self.status.textContent = 'Validando o código do servidor…';
        Portal.serverCodeResolve(code).then(function (r) {
          if (!r.ok) { self.status.textContent = r.message || 'Não foi possível validar este código. Tente novamente.'; return; }
          if (!r.host) { self.status.textContent = 'O Portal não retornou um servidor compatível.'; return; }
          self.askCredentials(code, r.host);
        });
      }
    });
  };

  MainScene.prototype.askCredentials = function (code, host) {
    var self = this;
    this.openKeyboard({
      title: 'Usuário da lista', message: 'Informe o usuário do seu acesso.', buttons: ['Continuar', 'Cancelar'],
      onButton: function (index, username) {
        username = EP.text(username);
        if (index !== 0 || !username) { self.status.textContent = 'Login por código cancelado.'; return; }
        self.openKeyboard({
          title: 'Senha da lista', message: 'Informe a senha do seu acesso.', buttons: ['Conectar', 'Cancelar'], secure: true,
          onButton: function (i, password) {
            if (i !== 0 || !password) { self.status.textContent = 'Login por código cancelado.'; return; }
            var playlist = Portal.useManualPlaylist({ name: 'Acesso por código', sourceType: 'xtream', credentials: { host: host, username: username, password: password } });
            self.manualSession = true;
            self.setActivationVisible(false);
            self.shell.show(true);
            self.shell.applyPlaylist({ display_name: 'Acesso por código', server_code: code, playlist: playlist });
          }
        });
      }
    });
  };

  EP.MainScene = MainScene;
}(window.EP));
