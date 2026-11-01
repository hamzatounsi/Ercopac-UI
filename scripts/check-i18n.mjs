// Key parity of the translation files: every language must have exactly the keys of en.json,
// with non-empty strings and the same {{placeholders}}. Usage: npm run check:i18n (exit code 1 on any problem).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/assets/i18n/', import.meta.url));
const flatten = (tree, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out); else out[path] = value;
  }
  return out;
};
const placeholders = text => [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort().join(',');

const reference = flatten(JSON.parse(readFileSync(dir + 'en.json', 'utf8')));
const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'en.json');
let problems = 0;
const report = (lang, message) => { console.error(`✗ ${lang}: ${message}`); problems++; };

for (const file of files) {
  const lang = file.replace('.json', '');
  const keys = flatten(JSON.parse(readFileSync(dir + file, 'utf8')));
  for (const key of Object.keys(reference)) {
    if (!(key in keys)) report(lang, `missing ${key}`);
    else if (typeof keys[key] !== 'string' || !keys[key].trim()) report(lang, `empty ${key}`);
    else if (placeholders(keys[key]) !== placeholders(reference[key])) report(lang, `placeholders differ in ${key}`);
  }
  for (const key of Object.keys(keys)) if (!(key in reference)) report(lang, `extra ${key}`);
}
console.log(problems ? `${problems} translation problem(s)` : `${files.length} languages match en.json (${Object.keys(reference).length} keys).`);
process.exit(problems ? 1 : 0);
