import { Pipe, PipeTransform } from '@angular/core';
import { toUpperName } from './name-format';

/**
 * Displays a business name in uppercase: {{ customer.name | upperName }}.
 * Use only for resource, customer, organisation, user and supplier names.
 */
@Pipe({ name: 'upperName', standalone: true })
export class UpperNamePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return toUpperName(value);
  }
}
