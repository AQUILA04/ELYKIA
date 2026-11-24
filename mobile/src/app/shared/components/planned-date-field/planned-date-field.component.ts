import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { normalizePlannedDate, todayIsoDate } from 'src/app/core/utils/tontine-planned-date.util';

/**
 * Champ « date de livraison prévue » : une carte cliquable avec icône calendrier, qui ouvre un
 * calendrier en français (jamais avant aujourd'hui). La date est facultative et peut être effacée.
 * Valeur échangée : AAAA-MM-JJ ou `null`.
 */
@Component({
  selector: 'app-planned-date-field',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './planned-date-field.component.html',
  styleUrls: ['./planned-date-field.component.scss']
})
export class PlannedDateFieldComponent {
  @Input() label = 'Livraison prévue';
  @Input() hint = 'Facultatif';
  @Input() disabled = false;
  @Input() testId = 'e2e-tontine-planned-date';
  @Input() set value(value: string | null | undefined) {
    this.current = normalizePlannedDate(value);
  }
  @Output() valueChange = new EventEmitter<string | null>();

  current: string | null = null;
  open = false;
  readonly min = todayIsoDate();

  get display(): string {
    if (!this.current) {
      return '';
    }
    const [year, month, day] = this.current.split('-').map(Number);
    const text = new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Date passée (commande ancienne rouverte) : affichée telle quelle, sans bloquer l'enregistrement. */
  get isPast(): boolean {
    return !!this.current && this.current < this.min;
  }

  openPicker(): void {
    if (!this.disabled) {
      this.open = true;
    }
  }

  closePicker(): void {
    this.open = false;
  }

  onPicked(event: Event): void {
    const raw = (event as CustomEvent<{ value?: string | string[] | null }>).detail?.value;
    const picked = normalizePlannedDate(Array.isArray(raw) ? raw[0] : raw);
    this.open = false;
    if (picked && picked !== this.current) {
      this.set(picked);
    }
  }

  clear(event?: Event): void {
    event?.stopPropagation();
    this.open = false;
    if (this.current !== null) {
      this.set(null);
    }
  }

  private set(value: string | null): void {
    this.current = value;
    this.valueChange.emit(value);
  }
}
