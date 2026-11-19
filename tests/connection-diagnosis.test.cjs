/* Por que a lista não abre (Android 2.17.77): regra de decisão. */
const assert = require('assert');
global.window = { EP: {} };
global.EP = window.EP;
require('../src/core/connectionDiagnosis.js');
const D = window.EP.ConnectionDiagnosis;
assert.strictEqual(D.decide('missing', 'network'), 'notFound');
assert.strictEqual(D.decide('unavailable', 'network'), 'offline');
assert.strictEqual(D.decide('exists', 'timeout'), 'unreachable');
assert.strictEqual(D.decide('exists', 'network'), 'blocked');
assert.ok(/DNS/.test(D.messages.blocked));
console.log('connection-diagnosis ok');
