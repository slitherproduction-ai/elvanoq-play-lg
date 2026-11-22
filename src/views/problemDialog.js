/* Janela "A lista não abriu" (canvas "ELVANOQ Play TV", tela 4), em
 * 1920×1080: motivo, o que foi verificado, o que fazer e as saídas
 * (Tentar de novo, Editar dados, Outra lista). ◀/▶ escolhem, OK confirma,
 * Voltar fecha.
 * opts: { message, onRetry, onEdit, onOther, onClose } */
(function (EP) {
  'use strict';
  var S = EP.Stage;
  var AMBER = '#F5B83D', GREEN = '#16C784', RED = '#FF8A8A', MUTED = '#A9B4C7';
  var SVG = {
    warning: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
    ok: '<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="2.6"/>',
    fail: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
    unknown: '<path d="M6 12h12"/>'
  };

  function esc(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function t(text) { return EP.tr ? EP.tr(text) : text; }
  function icon(name, size, color) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SVG[name] + '</svg>';
  }

  function ProblemDialog(stage, opts) {
    var self = this;
    this.opts = opts || {};
    this.closed = false;
    var problem = this.problem = EP.ListProblem.fromMessage(this.opts.message);
    var actions = [];
    var retry = this.opts.onRetry ? { label: 'Tentar de novo', fn: this.opts.onRetry, primary: problem.primary === 'retry' } : null;
    var edit = this.opts.onEdit ? { label: 'Editar dados', fn: this.opts.onEdit, primary: problem.primary === 'edit' } : null;
    var other = this.opts.onOther ? { label: 'Outra lista', fn: this.opts.onOther, primary: false } : null;
    var order = problem.primary === 'edit' ? [edit, retry, other] : [retry, edit, other];
    for (var i = 0; i < order.length; i++) if (order[i]) actions.push(order[i]);
    var hasPrimary = false;
    for (i = 0; i < actions.length; i++) if (actions[i].primary) hasPrimary = true;
    if (actions.length && !hasPrimary) actions[0].primary = true;
    if (!actions.length) actions.push({ label: 'Fechar', fn: null, primary: true });
    this.actions = actions;
    this.selected = 0;

    var checks = '';
    for (i = 0; i < problem.checks.length; i++) {
      var c = problem.checks[i], color = c.state === 'ok' ? GREEN : c.state === 'fail' ? RED : MUTED;
      checks += '<div style="flex:1;border-radius:20px;background:#141F33;padding:24px;' + (i ? 'margin-left:16px;' : '') + '">' +
        '<div style="display:flex;align-items:center;font-size:19px;font-weight:600;color:' + color + '">' + icon(c.state, 20, color) + '<span style="margin-left:10px">' + esc(t(c.label)) + '</span></div>' +
        '<div style="margin-top:10px;font-size:20px;color:' + MUTED + '">' + esc(t(c.detail)) + '</div></div>';
    }
    var buttons = '';
    for (i = 0; i < actions.length; i++) {
      buttons += '<div class="pd-btn" style="' + (i ? 'margin-left:16px;' : '') + 'flex:' + (actions[i].primary ? '1.3' : '1') + ';height:80px;border-radius:20px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;font-size:24px;' +
        (actions[i].primary ? 'background:#F4F8FF;color:#070B14;font-weight:700;border:3px solid #F4F8FF;' : 'background:#141F33;color:#F4F8FF;font-weight:600;border:1.5px solid rgba(136,148,168,0.35);') + '">' + esc(t(actions[i].label)) + '</div>';
    }

    var root = this.root = S.group(stage, { className: 'layer' });
    var html =
      '<div style="width:1120px;box-sizing:border-box;border-radius:36px;background:#0E1524;border:1px solid rgba(136,148,168,0.22);padding:64px;font-family:Inter,sans-serif;color:#F4F8FF">' +
        '<div style="display:flex;align-items:flex-start">' +
          '<div style="width:96px;height:96px;flex-shrink:0;border-radius:28px;background:rgba(245,184,61,0.14);display:flex;align-items:center;justify-content:center">' + icon('warning', 48, AMBER) + '</div>' +
          '<div style="margin-left:32px;flex:1">' +
            '<div style="font-size:18px;font-weight:600;letter-spacing:2.4px;color:' + AMBER + '">' + esc(t('A LISTA NÃO ABRIU')) + '</div>' +
            '<div style="margin-top:12px;font-size:46px;line-height:54px;font-weight:700;letter-spacing:-0.8px">' + esc(t(problem.title)) + '</div>' +
            '<div style="margin-top:12px;font-size:24px;line-height:36px;color:#C9D2E0">' + esc(t(problem.message)) + '</div>' +
          '</div>' +
        '</div>' +
        (checks ? '<div style="display:flex;margin-top:36px">' + checks + '</div>' : '') +
        '<div style="margin-top:36px;border-radius:20px;background:rgba(20,125,255,0.1);border:1px solid rgba(20,125,255,0.3);padding:26px 30px">' +
          '<div style="font-size:21px;font-weight:700">' + esc(t('O que fazer')) + '</div>' +
          '<div style="margin-top:8px;font-size:21px;line-height:32px;color:#C9D2E0">' + esc(t(problem.advice)) + '</div>' +
        '</div>' +
        '<div class="pd-actions" style="display:flex;margin-top:36px">' + buttons + '</div>' +
      '</div>';
    this.overlay = S.el(root, { x: 0, y: 0, w: 1920, h: 1080, css: 'background:rgba(4,7,13,0.93);display:flex;align-items:center;justify-content:center', html: html });
    this.buttons = this.overlay.querySelectorAll('.pd-btn');
    for (i = 0; i < this.buttons.length; i++) {
      (function (index) { self.buttons[index].addEventListener('click', function () { self.selected = index; self.choose(); }); }(i));
    }
    this.render();
  }

  ProblemDialog.prototype.render = function () {
    for (var i = 0; i < this.buttons.length; i++) {
      var node = this.buttons[i], primary = this.actions[i].primary, focused = i === this.selected;
      if (primary) node.style.boxShadow = focused ? '0 0 0 8px rgba(244,248,255,0.1)' : 'none';
      else {
        node.style.border = focused ? '3px solid #F4F8FF' : '1.5px solid rgba(136,148,168,0.35)';
        node.style.background = focused ? '#1A2438' : '#141F33';
      }
    }
  };

  ProblemDialog.prototype.handleKey = function (key) {
    if (key === 'back') { this.close(); if (this.opts.onClose) this.opts.onClose(); return true; }
    if (key === 'left' || key === 'up') { this.selected = Math.max(0, this.selected - 1); this.render(); }
    else if (key === 'right' || key === 'down') { this.selected = Math.min(this.actions.length - 1, this.selected + 1); this.render(); }
    else if (key === 'OK') this.choose();
    return true;
  };

  ProblemDialog.prototype.choose = function () {
    var action = this.actions[this.selected];
    this.close();
    if (this.opts.onClose) this.opts.onClose();
    if (action && action.fn) action.fn();
  };

  ProblemDialog.prototype.close = function () {
    if (this.closed) return;
    this.closed = true;
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  EP.ProblemDialog = ProblemDialog;
}(window.EP));
