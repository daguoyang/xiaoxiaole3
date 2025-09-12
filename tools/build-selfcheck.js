#!/usr/bin/env node
// Scan build outputs for sensitive patterns before submission
const fs = require('fs');
const path = require('path');

const root = path.join('build');
if (!fs.existsSync(root)) {
  console.error('build directory not found. Please run a build first.');
  process.exit(1);
}

const patterns = [
  /adunit-[A-Za-z0-9]+/g,
  /wx\d{16}/g,
  /麻将了个麻将|麻将|Mahjong/gi,
];

function scanFile(fp) {
  let out = [];
  const txt = fs.readFileSync(fp, 'utf8');
  patterns.forEach((re) => {
    let m;
    while ((m = re.exec(txt))) {
      out.push(`${fp}:${m.index}: ${m[0]}`);
    }
  });
  return out;
}

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (['.js', '.json', '.txt', '.html', '.css', ''].includes(ext)) {
        acc.push(...scanFile(p));
      }
    }
  }
}

const results = [];
walk(root, results);
if (results.length) {
  console.log('Potential sensitive matches in build:');
  results.forEach((l) => console.log(l));
  process.exit(2);
} else {
  console.log('Build self-check passed: no sensitive matches found.');
}

