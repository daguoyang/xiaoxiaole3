#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'assets/resources/config/balance.default.json';
const raw = fs.readFileSync(file, 'utf8');
let json;
try { json = JSON.parse(raw); } catch (e) { console.error('JSON parse error:', e.message); process.exit(1); }

function assert(cond, msg) { if (!cond) throw new Error(msg); }

try {
  assert(typeof json.version === 'string', 'version required');
  assert(json.difficulty && typeof json.difficulty.scorePerMatch === 'number', 'difficulty.scorePerMatch required');
  assert(json.hearts && typeof json.hearts.maxHearts === 'number', 'hearts.maxHearts required');
  assert(Array.isArray(json.drops?.weights), 'drops.weights array required');
  console.log('OK', file);
  process.exit(0);
} catch (e) {
  console.error('INVALID', e.message);
  process.exit(2);
}

