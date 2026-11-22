/* Janela "A lista não abriu" (canvas "ELVANOQ Play TV", tela 4): motivo,
 * verificações e ação principal a partir das mensagens do app. */
const assert = require('assert');
global.window = { EP: {} };
require('../src/core/connectionDiagnosis.js');
const P = require('../src/core/listProblem.js');
const M = window.EP.ConnectionDiagnosis.messages;

const blocked = P.fromMessage(M.blocked);
assert.strictEqual(blocked.kind, 'blocked');
assert.strictEqual(blocked.title, 'Bloqueio provável da operadora');
assert.deepStrictEqual(blocked.checks.map((c) => c.state), ['ok', 'ok', 'fail']);
assert.strictEqual(blocked.primary, 'retry');
assert.strictEqual(P.fromMessage(M.notFound).primary, 'edit');
assert.strictEqual(P.fromMessage(M.offline).checks[0].state, 'fail');
assert.strictEqual(P.fromMessage(M.unreachable).kind, 'unreachable');
const expired = P.fromMessage('A lista venceu em 10/11/2026. Fale com a sua revenda para renovar.');
assert.strictEqual(expired.message, 'A conta desta lista venceu em 10/11/2026.');
assert.strictEqual(P.fromMessage('A lista está bloqueada no servidor. Fale com a sua revenda.').kind, 'blockedAccount');
assert.strictEqual(P.fromMessage('A lista recusou o usuário e a senha. Confira os dados da lista ou fale com a sua revenda.').primary, 'edit');
assert.strictEqual(P.fromMessage('O servidor recusou o acesso (HTTP 401). Confira o usuário e a senha da lista ou fale com a sua revenda.').kind, 'denied');
assert.strictEqual(P.fromMessage('O servidor da lista está fora do ar ou sobrecarregado (HTTP 502). Tente novamente em alguns minutos.').kind, 'serverDown');
assert.strictEqual(P.fromMessage('O servidor respondeu algo que não é uma lista. Confira o endereço do servidor.').kind, 'invalid');
assert.strictEqual(P.fromMessage('Catálogo indisponível.').kind, 'unknown');

require('../src/core/i18n-en.js');
const EN = window.EP.I18N_EN;
for (const k of ['A LISTA NÃO ABRIU', 'O que fazer', 'Tentar de novo', 'Editar dados', blocked.title, blocked.message, blocked.advice, 'Recusada pela rede']) {
  assert.ok(EN[k], 'tradução: ' + k);
}
console.log('list problem: OK');
