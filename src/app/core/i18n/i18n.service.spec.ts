import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { I18nService } from './i18n.service';
import { translateTestingModule } from './translate-testing';

describe('I18nService', () => {
  let i18n: I18nService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [translateTestingModule()] });
    i18n = TestBed.inject(I18nService);
    translate = TestBed.inject(TranslateService);
  });

  const httpError = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

  it('translates keys with parameters', () => {
    expect(i18n.t('validation.minLength', { min: 5 })).toContain('5');
    expect(i18n.t('ticketing.details.moveTo', { status: 'Open' })).toBe('Move to Open');
  });

  it('keeps the specific backend message in English', () => {
    translate.use('en');
    expect(i18n.error(httpError(400, { message: 'Code already used' }), 'ticketing.customers.couldNotSaved')).toBe('Code already used');
  });

  it('uses the translated context instead of the English backend message in other languages', () => {
    translate.setTranslation('fr', { ticketing: { customers: { couldNotSaved: 'Impossible d’enregistrer.' } }, errors: { FORBIDDEN: 'Accès refusé.' } });
    translate.use('fr');
    expect(i18n.error(httpError(400, { message: 'Code already used' }), 'ticketing.customers.couldNotSaved')).toBe('Impossible d’enregistrer.');
    expect(i18n.error(httpError(403, { message: 'Forbidden', code: 'FORBIDDEN' }), 'ticketing.customers.couldNotSaved'))
      .toBe('Impossible d’enregistrer. Accès refusé.');
  });

  it('adds the generic reason when there is no backend message, and ignores non-HTTP errors', () => {
    translate.use('en');
    expect(i18n.error(httpError(0), 'ticketing.list.ticketsCouldNotLoaded'))
      .toBe('Tickets could not be loaded. The server cannot be reached. Check your connection and try again.');
    expect(i18n.error(new Error('boom'), 'ticketing.list.ticketsCouldNotLoaded')).toBe('Tickets could not be loaded.');
  });

  it('keeps informational API messages in English only', () => {
    translate.use('en');
    expect(i18n.server('Reset link sent', 'login.passwordResetRequestSent')).toBe('Reset link sent');
    expect(i18n.server('', 'login.passwordResetRequestSent')).toBe('Password reset request sent.');
    translate.setTranslation('fr', { login: { passwordResetRequestSent: 'Demande envoyée.' } });
    translate.use('fr');
    expect(i18n.server('Reset link sent', 'login.passwordResetRequestSent')).toBe('Demande envoyée.');
  });
});
