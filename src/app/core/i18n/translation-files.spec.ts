import en from 'src/assets/i18n/en.json';
import fr from 'src/assets/i18n/fr.json';
import de from 'src/assets/i18n/de.json';
import ar from 'src/assets/i18n/ar.json';
import italian from 'src/assets/i18n/it.json';
import es from 'src/assets/i18n/es.json';
import pt from 'src/assets/i18n/pt.json';
import tr from 'src/assets/i18n/tr.json';
import nl from 'src/assets/i18n/nl.json';
import zh from 'src/assets/i18n/zh.json';
import { LANGUAGES } from './languages';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object') flatten(value, path, out); else out[path] = value;
  }
  return out;
}

// Same rule as scripts/check-i18n.mjs, so a missing or extra key also fails `npm test`.
describe('Translation files', () => {
  const files: Record<string, Tree> = { en, fr, de, ar, it: italian, es, pt, tr, nl, zh };
  const reference = Object.keys(flatten(en)).sort();

  it('exist for every supported language', () => {
    expect(Object.keys(files).sort()).toEqual(LANGUAGES.map(l => l.code).sort());
  });

  for (const lang of Object.keys(files).filter(l => l !== 'en')) {
    it(`${lang}.json has exactly the keys of en.json, all non-empty`, () => {
      const keys = flatten(files[lang]);
      expect(Object.keys(keys).sort()).toEqual(reference);
      expect(Object.entries(keys).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    });
  }
});
