const assert = require('node:assert/strict');
const rules = require('../playlist-utils.js');

const m3u = { name: 'Portal M3U', kind: 'm3u', credentials: { url: 'https://provider.example:8443/live.m3u?token=private' }, updated_at: '2026-10-23T12:00:00Z' };
const xtream = { name: 'Portal Xtream', kind: 'xtream', credentials: { host: 'http://provider.example:8080', username: 'user', password: 'secret' } };
const granted = { active: true, license: { can_play: true }, code_access: { can_connect: true } };

assert.equal(rules.normalize(m3u).sourceType, 'm3u');
assert.equal(rules.normalize(m3u).credentials.url, m3u.credentials.url);
assert.equal(rules.normalize(xtream).sourceType, 'xtream');
assert.equal(rules.normalize(xtream).credentials.host, xtream.credentials.host);
assert.equal(rules.allowed(granted), true, 'annual/vitalício/individual are defined by server can_play');
assert.equal(rules.allowed({ active: true, license: { can_play: false } }), false, 'expired/blocked license');
assert.equal(rules.allowed({ active: false, license: { can_play: true } }), false, 'disabled TV');
assert.equal(rules.allowed({ active: true, license: { can_play: true }, code_access: { can_connect: false } }), false, 'restricted code denied');
const local = [{ id: 'manual-1', sourceId: 'manual-1', sourceType: 'm3u', favorites: ['a'], history: ['b'] }];
let merged = rules.merge(local, m3u, 'a'.repeat(64));
assert.equal(merged.items.length, 2, 'keeps local lists');
merged = rules.merge(merged.items, xtream, 'a'.repeat(64));
assert.equal(merged.items.length, 2, 'updates Portal entry without duplication');
assert.equal(merged.items[1].sourceType, 'xtream');
assert.equal(rules.merge(local, null, 'a'.repeat(64)).items.length, 1, 'null playlist never deletes local data');
assert.equal(rules.normalize({ kind: 'm3u', credentials: {} }), null);
console.log('playlist sync rules: OK');
