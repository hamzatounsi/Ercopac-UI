import { Directive, ElementRef, HostListener, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { toUpperName } from './name-format';

/**
 * Uppercases a name input as the user types (resource, customer, organisation,
 * user and supplier names). Works with ngModel, formControlName and plain inputs:
 *
 *   <input appUppercaseName formControlName="name" />
 *
 * The control's value accessor is wrapped in the constructor, before the forms
 * module wires it up, so the model always receives the uppercase value whatever
 * the order of the input listeners. The caret position is kept.
 * Only use it on name fields: never on emails, logins or free text.
 */
@Directive({
  selector: 'input[appUppercaseName], textarea[appUppercaseName]',
  standalone: true,
  host: { class: 'uppercase-name-input', autocapitalize: 'characters' }
})
export class UppercaseNameDirective {
  constructor(
    private readonly elementRef: ElementRef<HTMLInputElement | HTMLTextAreaElement>,
    @Optional() @Self() ngControl: NgControl | null
  ) {
    const accessor = ngControl?.valueAccessor;
    if (accessor) {
      const registerOnChange = accessor.registerOnChange.bind(accessor);
      accessor.registerOnChange = (fn: (value: unknown) => void) =>
        registerOnChange((value: unknown) => fn(this.applyToElement(value)));
    }
  }

  /** Fallback for inputs without a forms directive. */
  @HostListener('input')
  onInput(): void {
    this.applyToElement(this.elementRef.nativeElement.value);
  }

  private applyToElement(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }
    const upper = value.toUpperCase();
    const element = this.elementRef.nativeElement;
    if (element.value !== upper) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      element.value = upper;
      if (start !== null && end !== null && document.activeElement === element) {
        element.setSelectionRange(start, end);
      }
    }
    return upper;
  }
}

export { toUpperName };
