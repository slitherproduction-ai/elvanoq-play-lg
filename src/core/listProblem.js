/* Janela "A lista não abriu" (canvas "ELVANOQ Play TV", tela 4): o motivo em
 * título, o que foi verificado (internet, endereço, conexão ou conta) e o que
 * fazer, a partir das mensagens que o app já produz (connectionDiagnosis e
 * catalogService). Mesmas regras do Android e do Vega (listProblem.ts).
 * EP.ListProblem.fromMessage(texto) -> { kind, title, message, advice, checks, primary } */
(function (root) {
  'use strict';
  var EP = root.EP = root.EP || {};

  function ok(label, detail) { return { label: label, detail: detail, state: 'ok' }; }
  function fail(label, detail) { return { label: label, detail: detail, state: 'fail' }; }
  function unknown(label, detail) { return { label: label, detail: detail, state: 'unknown' }; }
  function internetOk() { return ok('Internet', 'A TV está online'); }
  function addressOk() { return ok('Endereço', 'Existe no DNS público'); }
  function serverOk() { return ok('Servidor', 'Respondeu'); }

  function connection(verdict) {
    if (verdict === 'blocked') return {
      title: 'Bloqueio provável da operadora',
      message: 'O endereço do servidor existe, mas esta TV não conseguiu conectar. Pode ser bloqueio de DNS da operadora ou o servidor fora do ar.',
      advice: 'Troque o DNS da TV ou do roteador (por exemplo 1.1.1.1 ou 8.8.8.8). Se não resolver, fale com a sua revenda.',
      checks: [internetOk(), addressOk(), fail('Conexão', 'Recusada pela rede')], primary: 'retry'
    };
    if (verdict === 'unreachable') return {
      title: 'O servidor não respondeu',
      message: 'O endereço do servidor existe, mas a conexão não abriu. Ele pode estar fora do ar ou bloqueado pela operadora.',
      advice: 'Tente mais tarde. Se continuar, troque o DNS da TV ou do roteador (1.1.1.1 ou 8.8.8.8) ou fale com a sua revenda.',
      checks: [internetOk(), addressOk(), fail('Conexão', 'Sem resposta do servidor')], primary: 'retry'
    };
    if (verdict === 'notFound') return {
      title: 'Endereço do servidor não existe',
      message: 'O nome do servidor da lista não foi encontrado em nenhum DNS. O endereço pode estar errado ou ter sido desativado.',
      advice: 'Confira o endereço com a sua revenda e edite os dados da lista.',
      checks: [internetOk(), fail('Endereço', 'Não existe'), unknown('Conexão', 'Não testada')], primary: 'edit'
    };
    return {
      title: 'TV sem internet',
      message: 'Nem o servidor da lista nem o DNS público responderam.',
      advice: 'Confira o Wi-Fi ou o cabo de rede e tente de novo.',
      checks: [fail('Internet', 'Sem conexão'), unknown('Endereço', 'Não testado'), unknown('Conexão', 'Não testada')], primary: 'retry'
    };
  }

  function make(kind, data) { data.kind = kind; return data; }

  function fromMessage(raw, messages) {
    var message = String(raw || '').replace(/^\s+|\s+$/g, '');
    var known = messages || (EP.ConnectionDiagnosis && EP.ConnectionDiagnosis.messages) || {};
    var verdicts = ['blocked', 'unreachable', 'notFound', 'offline'];
    for (var i = 0; i < verdicts.length; i++) {
      if (known[verdicts[i]] && message.indexOf(known[verdicts[i]]) >= 0) return make(verdicts[i], connection(verdicts[i]));
    }
    var lower = message.toLowerCase();
    var expired = /a lista venceu(?: em ([0-9]{1,4}(?:[.\/-][0-9]{1,4}){2}))?/i.exec(message);
    if (expired) return make('expired', {
      title: 'A lista venceu',
      message: expired[1] ? 'A conta desta lista venceu em ' + expired[1] + '.' : 'A conta desta lista está vencida no servidor.',
      advice: 'Fale com a sua revenda para renovar. Depois, é só tentar de novo.',
      checks: [internetOk(), serverOk(), fail('Conta', 'Vencida')], primary: 'retry'
    });
    if (lower.indexOf('bloqueada no servidor') >= 0) return make('blockedAccount', {
      title: 'A lista está bloqueada',
      message: 'O servidor respondeu, mas a conta desta lista está bloqueada ou desativada.',
      advice: 'Fale com a sua revenda.',
      checks: [internetOk(), serverOk(), fail('Conta', 'Bloqueada')], primary: 'retry'
    });
    if (lower.indexOf('recusou o usuário e a senha') >= 0 || lower.indexOf('usuário ou senha') >= 0) return make('refused', {
      title: 'Usuário ou senha recusados',
      message: 'O servidor respondeu, mas não aceitou o usuário e a senha desta lista.',
      advice: 'Confira os dados da lista. Se estiverem certos, fale com a sua revenda.',
      checks: [internetOk(), serverOk(), fail('Conta', 'Dados recusados')], primary: 'edit'
    });
    var http = /\(HTTP (\d{3})\)/.exec(message);
    if (http && (http[1] === '401' || http[1] === '403')) return make('denied', {
      title: 'O servidor recusou o acesso',
      message: 'O servidor respondeu, mas recusou o acesso (HTTP ' + http[1] + ').',
      advice: 'Confira o usuário e a senha da lista ou fale com a sua revenda.',
      checks: [internetOk(), serverOk(), fail('Acesso', 'Recusado (HTTP ' + http[1] + ')')], primary: 'edit'
    });
    if (http && Number(http[1]) >= 500) return make('serverDown', {
      title: 'Servidor fora do ar',
      message: 'O servidor da lista está fora do ar ou sobrecarregado (HTTP ' + http[1] + ').',
      advice: 'Tente novamente em alguns minutos. Se continuar, fale com a sua revenda.',
      checks: [internetOk(), ok('Endereço', 'Encontrado'), fail('Servidor', 'Erro HTTP ' + http[1])], primary: 'retry'
    });
    if (lower.indexOf('não é uma lista') >= 0) return make('invalid', {
      title: 'A resposta não é uma lista',
      message: 'O endereço respondeu, mas não com uma lista IPTV. O endereço ou a porta podem estar errados.',
      advice: 'Confira o endereço do servidor com a sua revenda.',
      checks: [internetOk(), ok('Endereço', 'Respondeu'), fail('Lista', 'Resposta inválida')], primary: 'edit'
    });
    return make('unknown', {
      title: 'Não foi possível conectar',
      message: message || 'A lista não respondeu como esperado.',
      advice: 'Confira os dados da lista e tente de novo. Se continuar, fale com a sua revenda.',
      checks: [], primary: 'retry'
    });
  }

  EP.ListProblem = { fromMessage: fromMessage };
  if (typeof module !== 'undefined' && module.exports) module.exports = EP.ListProblem;
}(typeof window !== 'undefined' ? window : globalThis));
