import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MISE_DAY_STEP, misesTotal } from './mise-day-pills.logic';

@Component({
  selector: 'app-mise-day-pills',
  templateUrl: './mise-day-pills.component.html',
  styleUrls: ['./mise-day-pills.component.scss'],
  standalone: false,
})
export class MiseDayPillsComponent {
  @Input() dailyMise = 0;
  @Input() maxDays = MISE_DAY_STEP;
  /** null = aucun jour choisi. 0 = zéro jour coché, total des mises nul. */
  @Input() selectedUpTo: number | null = null;
  @Input() disabled = false;
  @Input() testIdPrefix = 'e2e-rm-mise-day';
  @Output() selectedUpToChange = new EventEmitter<number | null>();
  @Output() maxDaysChange = new EventEmitter<number>();

  get days(): number[] {
    const max = Math.max(0, Math.floor(this.maxDays || 0));
    const list: number[] = [];
    for (let day = 1; day <= max; day++) {
      list.push(day);
    }
    return list;
  }

  get misesAmount(): number {
    return misesTotal(this.selectedUpTo, this.dailyMise);
  }

  get selectedCount(): number {
    return this.selectedUpTo != null && this.selectedUpTo > 0 ? this.selectedUpTo : 0;
  }

  isCovered(day: number): boolean {
    return this.selectedUpTo != null && this.selectedUpTo > 0 && day <= this.selectedUpTo;
  }

  isSelected(day: number): boolean {
    return this.selectedUpTo === day;
  }

  onChipClick(day: number): void {
    if (this.disabled) {
      return;
    }
    this.selectedUpToChange.emit(this.selectedUpTo === day ? null : day);
  }

  extend(): void {
    if (this.disabled) {
      return;
    }
    const current = Math.max(MISE_DAY_STEP, Math.floor(this.maxDays || MISE_DAY_STEP));
    this.maxDaysChange.emit(current + MISE_DAY_STEP);
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }
}
