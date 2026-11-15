import { UppercaseNameDirective } from './uppercase-name.directive';
import { UpperNamePipe } from './upper-name.pipe';

export { UppercaseNameDirective } from './uppercase-name.directive';
export { UpperNamePipe } from './upper-name.pipe';
export { toUpperName, nameMatchKey } from './name-format';

/** Import into a feature module or standalone component to use both helpers. */
export const NAME_FORMAT_IMPORTS = [UppercaseNameDirective, UpperNamePipe] as const;
