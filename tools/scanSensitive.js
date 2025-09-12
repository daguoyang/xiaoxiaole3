#!/usr/bin/env node
/* Simple sensitive pattern scan: ad units, wx appid, brand terms */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patterns = [
  /adunit-[A-Za-z0-9]+/g, // WeChat ad unit id
  /wx\d{16}/g, // WeChat app id
  /麻将了个麻将|麻将|Mahjong/gi, // brand keywords
];

function scanFile(fp) {
  const txt = fs.readFileSync(fp, 'utf8');
  patterns.forEach((re) => {
    let m;
    while ((m = re.exec(txt))) {
      console.log(`${fp}:${m.index}: ${m[0]}`);
    }
  });
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'library' || name === 'build' || name === 'temp') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (st.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (['.ts', '.js', '.json', '.md', '.scene', '.prefab', '.txt'].includes(ext)) {
        // skip scanning this script itself
        if (p.endsWith(path.sep + 'scanSensitive.js')) continue;
        scanFile(p);
      }
    }
  }
}

walk(root);
