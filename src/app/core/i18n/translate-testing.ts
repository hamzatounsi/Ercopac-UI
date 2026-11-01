import { ModuleWithProviders } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import english from 'src/assets/i18n/en.json';

class EnglishLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, unknown>> {
    return of(english);
  }
}

/** TranslateModule for unit tests, serving the real English file synchronously so specs can assert on the rendered text. */
export function translateTestingModule(): ModuleWithProviders<TranslateModule> {
  return TranslateModule.forRoot({ defaultLanguage: 'en', loader: { provide: TranslateLoader, useClass: EnglishLoader } });
}
