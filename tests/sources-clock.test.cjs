/* Qualidades do canal numa linha e hora do servidor (Android 2.17.75). */
const assert = require('assert');
global.window = { EP: {} };
global.EP = window.EP;
require('../src/core/ns.js');
require('../src/core/channelGroups.js');
require('../src/core/serverClock.js');
const EP = window.EP;
const G = EP.ChannelGroups;
const ch = (id, title, category = 'Abertos') => ({ id, title, category });
const list = [ch('1', 'Globo SP FHD'), ch('2', 'Globo SP HD'), ch('3', 'Globo SP [ALT]'), ch('4', 'Globo RJ HD'), ch('5', 'ESPN HD'), ch('6', 'ESPN 2 HD'), ch('7', 'ESPN ᴴᴰ')];
const rows = G.group(list);
assert.deepStrictEqual(rows.map((r) => r.group_title || r.title), ['Globo SP', 'Globo RJ HD', 'ESPN', 'ESPN 2 HD']);
assert.deepStrictEqual(rows[0].sources.map((s) => s.id), ['1', '2', '3']);
assert.deepStrictEqual(G.sourceLabels(rows[0].sources), ['FHD', 'HD', 'ALT']);
assert.strictEqual(G.group([ch('1', 'HBO HD', 'a'), ch('2', 'HBO SD', 'b')]).length, 2);
assert.ok(G.matches(rows[0], '3'));
assert.strictEqual(G.nextUntried(rows[0].sources, '1', { 2: true }).id, '3');
assert.strictEqual(G.groupName('TNT | FHD'), 'TNT');

const C = EP.Clock;
const now = Date.UTC(2026, 10, 19, 12);
const server = new Date(now + 37 * 60000).toUTCString();
C.noteDate(server, now); assert.strictEqual(C.offset(), 0);
C.noteDate(server, now); assert.strictEqual(Math.round(C.offset() / 60000), 37);
C.reset();
C.noteTimestamp((now - 3 * 3600000) / 1000, now); assert.strictEqual(C.offset(), 0);
C.noteTimestamp((now + 25 * 60000) / 1000, now); assert.strictEqual(Math.round(C.offset() / 60000), 25);
console.log('sources-clock ok');
