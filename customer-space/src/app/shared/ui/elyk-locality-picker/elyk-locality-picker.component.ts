import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  forwardRef,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CustomerLocality, OTHER_LOCALITY_LABEL } from '../../models/customer-auth.model';

/**
 * Sélecteur de localité (ControlValueAccessor) — liste filtrable pour le formulaire d'inscription.
 * La valeur du formulaire est le nom de la localité (stocké en Client.quarter).
 */
@Component({
  selector: 'app-elyk-locality-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './elyk-locality-picker.component.html',
  styleUrls: ['./elyk-locality-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ElykLocalityPickerComponent),
      multi: true,
    },
  ],
})
export class ElykLocalityPickerComponent implements ControlValueAccessor {
  readonly otherLabel = OTHER_LOCALITY_LABEL;

  @Input() label = 'Ma zone (Localités)';
  @Input() icon = 'location-outline';
  @Input() localities: CustomerLocality[] = [];
  @Input() loading = false;
  @Input() loadError = '';
  @Input() testId = 'e2e-auth-register-quarter';

  readonly retryLoad = output<void>();
  readonly customChange = output<boolean>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('customInput') customInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  disabled = false;
  value = '';
  customMode = false;
  customText = '';

  private emitting = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get filtered(): CustomerLocality[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.localities;
    return this.localities.filter((l) => l.name.toLowerCase().includes(q));
  }

  get displayLabel(): string {
    if (this.customMode) {
      const typed = this.customText.trim();
      return typed || this.otherLabel;
    }
    return this.value || 'Sélectionnez votre zone';
  }

  get displayIsPlaceholder(): boolean {
    if (this.customMode) {
      return !this.customText.trim();
    }
    return !this.value;
  }

  writeValue(value: string | null): void {
    if (this.emitting) {
      return;
    }
    const next = value ?? '';
    this.value = next;
    if (!next) {
      this.customMode = false;
      this.customText = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(): void {
    if (this.disabled || this.loading) return;
    this.open = !this.open;
    this.onTouched();
    if (this.open) {
      this.query = '';
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
    }
  }

  select(locality: CustomerLocality): void {
    this.customMode = false;
    this.customText = '';
    this.value = locality.name;
    this.emitValue(locality.name);
    this.customChange.emit(false);
    this.onTouched();
    this.open = false;
    this.query = '';
  }

  selectOther(): void {
    this.customMode = true;
    this.value = '';
    this.emitValue(this.customText);
    this.customChange.emit(true);
    this.onTouched();
    this.open = false;
    this.query = '';
    setTimeout(() => this.customInput?.nativeElement?.focus(), 50);
  }

  onCustomText(text: string): void {
    this.customText = text;
    this.emitValue(text);
    this.onTouched();
  }

  close(): void {
    this.open = false;
    this.onTouched();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  onRetryClick(): void {
    this.retryLoad.emit();
  }

  private emitValue(value: string): void {
    this.emitting = true;
    this.onChange(value);
    this.emitting = false;
  }
}
