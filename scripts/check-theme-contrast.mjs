// WCAG AA contrast check of the design tokens in all three themes.
// Usage: npm run check:contrast   (exits with 1 when a pair is below its minimum ratio)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/styles/_tokens.scss', import.meta.url)), 'utf8');

function block(selector) {
  const start = source.indexOf(selector + ' {');
  if (start < 0) throw new Error(`Missing ${selector}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i);
  }
  throw new Error(`Unclosed ${selector}`);
}
function tokens(text) {
  const out = {};
  for (const m of text.matchAll(/--(pm-[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out[m[1]] = m[2];
  return out;
}

const light = tokens(block(':root'));
const themes = {
  light,
  dim: { ...light, ...tokens(block(':root[data-theme="dim"]')) },
  dark: { ...light, ...tokens(block(':root[data-theme="dark"]')) }
};

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const surfaces = ['pm-surface', 'pm-surface-muted', 'pm-surface-sunken', 'pm-surface-raised', 'pm-bg'];
const statuses = ['primary', 'success', 'warning', 'danger', 'info', 'accent'];
const checks = [];
for (const fg of ['pm-text', 'pm-text-muted', 'pm-text-soft']) for (const bg of surfaces) checks.push([fg, bg, 4.5, 'text']);
for (const s of statuses) {
  checks.push(['pm-on-accent', `pm-${s}`, 4.5, 'button / solid badge']);
  checks.push(['pm-on-accent', `pm-${s}-strong`, 4.5, 'button hover']);
  checks.push([`pm-${s}-text`, `pm-${s}-soft`, 4.5, 'status chip']);
  checks.push([`pm-${s}-text`, 'pm-surface', 4.5, 'status text']);
}
for (const bg of ['pm-surface', 'pm-surface-muted']) checks.push(['pm-input-border', bg, 3, 'input border (UI component)']);
for (let i = 1; i <= 6; i++) checks.push([`pm-chart-${i}`, 'pm-surface', 3, 'chart series (graphics)']);
checks.push(['pm-chrome-text', 'pm-chrome-bg', 4.5, 'sidebar text'], ['pm-chrome-muted', 'pm-chrome-bg', 4.5, 'sidebar muted'], ['pm-chrome-text', 'pm-chrome-surface', 4.5, 'sidebar active'],
  ['pm-chrome-muted', 'pm-chrome-surface', 4.5, 'sidebar muted on card'], ['pm-chrome-accent', 'pm-chrome-bg', 4.5, 'sidebar accent'],
  ['pm-chrome-accent', 'pm-chrome-surface', 4.5, 'sidebar accent on card'], ['pm-chrome-danger', 'pm-chrome-bg', 4.5, 'sidebar danger']);

let failures = 0;
for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg, min, use] of checks) {
    if (!t[fg] || !t[bg]) { console.error(`✗ ${name}: ${fg} or ${bg} is not a hex colour`); failures++; continue; }
    const r = ratio(t[fg], t[bg]);
    if (r < min) { console.error(`✗ ${name.padEnd(5)} ${fg} on ${bg} = ${r.toFixed(2)} (needs ${min}, ${use})`); failures++; }
  }
}
console.log(failures ? `${failures} contrast problem(s)` : `All ${checks.length * 3} token pairs meet WCAG AA in light, dim and dark.`);
process.exit(failures ? 1 : 0);
