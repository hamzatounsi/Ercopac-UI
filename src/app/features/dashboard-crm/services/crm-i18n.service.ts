import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, distinctUntilChanged, map } from 'rxjs';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { LanguageService } from 'src/app/core/i18n/language.service';
import { LanguageCode } from 'src/app/core/i18n/languages';

// Values that come from the database (stage names, lead sources, statuses...) and their crm.dynamic.* keys
const DYNAMIC_KEYS: Record<string, string> = {
  'Make presentation': 'makePresentation', 'Problem setting': 'problemSetting', 'Problem solving': 'problemSolving', 'Proposal/Quote': 'proposalQuote',
  'Negotiation/Revision': 'negotiationRevision', 'Closed won': 'closedWon', 'Closed lost': 'closedLost', Abandoned: 'abandoned',
  Qualification: 'qualification', Discovery: 'discovery', 'Needs Analysis': 'needsAnalysis', 'Value Proposition': 'valueProposition',
  'Identify Decision Makers': 'identifyDecisionMakers', 'Perception Analysis': 'perceptionAnalysis', 'Proposal/Price Quote': 'proposalPriceQuote', 'Negotiation/Review': 'negotiationReview',
  'Closed Won': 'closedWon', 'Closed Lost': 'closedLost', Prospecting: 'prospecting', 'Contact Made': 'contactMade',
  'Meeting Scheduled': 'meetingScheduled', REFERRAL: 'referral', TRADE_FAIR: 'tradeFair', AGENT: 'agent',
  CUSTOMER: 'customer', PARTNER: 'partner', OTHER: 'other', WEBSITE: 'website',
  SOCIAL_MEDIA: 'socialMedia', EMAIL: 'email', COLD_CALL: 'coldCall', INBOUND: 'inbound',
  OUTBOUND: 'outbound', NOT_CONTACTED: 'notContacted', CONTACTED: 'contacted', CONVERTED: 'converted',
  CONTACT_IN_FUTURE: 'contactInFuture', BP: 'bp', CS: 'cs', MTO: 'mto',
  ETO: 'eto', Unassigned: 'unassigned', System: 'system', Owner: 'owner',
  'Industry not specified': 'industryNotSpecified', 'Country not specified': 'countryNotSpecified', Account: 'account', Contact: 'contact',
  Hot: 'hot', Warm: 'warm', Cold: 'cold', 'No rating': 'noRating',
  Referral: 'referral', 'Trade fair': 'tradeFair', Agent: 'agent', Customer: 'customer',
  Partner: 'partner', Other: 'other'
};

/**
 * CRM translations. The texts live in the application translation files under `crm.*`
 * (src/assets/i18n/<lang>.json), so the CRM follows the language chosen in the profile menu.
 */
@Injectable({ providedIn: 'root' })
export class CrmI18nService {
  readonly lang$: Observable<LanguageCode>;

  constructor(private language: LanguageService, private translate: TranslateService, private i18n: I18nService) {
    this.lang$ = language.language$.pipe(map(option => option.code), distinctUntilChanged());
  }

  get currentLang(): LanguageCode {
    return this.language.current;
  }

  setLang(lang: LanguageCode): void {
    void this.language.use(lang);
  }

  /** Translates a CRM key, e.g. `accounts.pageTitle` → `crm.accounts.pageTitle`. */
  t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(`crm.${key}`, params);
  }

  /** Message for a failed API call (see I18nService.error). */
  error(error: unknown, key: string, params?: Record<string, unknown>): string {
    return this.i18n.error(error, `crm.${key}`, params);
  }

  /** Translates values that come from the database (stage names, sources, statuses...); unknown values are shown as they are. */
  translateDynamic(value: string): string {
    const key = value ? DYNAMIC_KEYS[value] : undefined;
    return key ? this.translate.instant(`crm.dynamic.${key}`) : value;
  }
}
