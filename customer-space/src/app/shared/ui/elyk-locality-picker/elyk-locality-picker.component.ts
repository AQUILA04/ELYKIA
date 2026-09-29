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
import { CustomerLocality } from '../../models/customer-auth.model';

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
  @Input() label = 'Ma zone (Localités)';
  @Input() icon = 'location-outline';
  @Input() localities: CustomerLocality[] = [];
  @Input() loading = false;
  @Input() loadError = '';
  @Input() testId = 'e2e-auth-register-quarter';

  readonly retryLoad = output<void>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  disabled = false;
  value = '';

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get filtered(): CustomerLocality[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.localities;
    return this.localities.filter((l) => l.name.toLowerCase().includes(q));
  }

  get displayLabel(): string {
    return this.value || 'Sélectionnez votre zone';
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
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
    this.value = locality.name;
    this.onChange(locality.name);
    this.onTouched();
    this.open = false;
    this.query = '';
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
}
