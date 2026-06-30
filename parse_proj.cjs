const fs = require('fs');
const acorn = require('./node_modules/acorn/dist/acorn.js');
const depsFile = './node_modules/.vite/deps/@univerjs_preset-sheets-core.js';
if (!fs.existsSync(depsFile)) {
  const allDeps = fs.existsSync('./node_modules/.vite/deps') ? fs.readdirSync('./node_modules/.vite/deps').filter(f=>f.includes('univer')).join('\n') : 'NO DEPS DIR';
  console.log('NO BUNDLED FILE. Univer deps:\n' + allDeps);
  process.exit(0);
}
const code = fs.readFileSync(depsFile, 'utf8');
console.log('FILE SIZE:', code.length);
try {
  acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  console.log('PARSE OK');
} catch(e) {
  const lines = code.split('\n');
  const line = (e.loc && e.loc.line) || 1;
  const col = (e.loc && e.loc.column) || 0;
  console.log('ERROR LINE:', line, 'COL:', col);
  console.log('CODE:', (lines[line-1]||'').substring(Math.max(0,col-10), col+100));
  console.log('MESSAGE:', e.message);
}
