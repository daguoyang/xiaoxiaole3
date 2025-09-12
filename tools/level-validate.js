#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = 'assets/resources/levels';

function validatePack(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let json; try { json = JSON.parse(raw); } catch (e) { throw new Error(file+': JSON parse error'); }
  if (!Array.isArray(json)) throw new Error(file+': expected array of LevelConfig');
  json.forEach((lv, i) => {
    if (typeof lv.id !== 'number') throw new Error(file+`[${i}]: id required number`);
    if (typeof lv.rows !== 'number' || typeof lv.cols !== 'number') throw new Error(file+`[${i}]: rows/cols required`);
    if (typeof lv.moves !== 'number') throw new Error(file+`[${i}]: moves required`);
    if (!Array.isArray(lv.goals) || lv.goals.length === 0) throw new Error(file+`[${i}]: goals required`);
  });
}

for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.json')) {
    const p = path.join(root, name);
    try { validatePack(p); console.log('OK', p); } catch (e) { console.error('INVALID', p, e.message); process.exitCode = 1; }
  }
}

