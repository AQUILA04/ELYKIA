import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CreditEcheanceDTO, UrgencyLevel } from 'src/app/credit/models/credit-echeance.model';

@Component({
  selector: 'app-credit-echeance-table',
  templateUrl: './credit-echeance-table.component.html',
  styleUrls: ['./credit-echeance-table.component.scss'],
  standalone: false
})
export class CreditEcheanceTableComponent implements OnChanges {
  @Input() credits: CreditEcheanceDTO[] = [];
  @Input() isLoading: boolean = false;

  readonly pageSize = 10;
  currentPage = 1;
  paginatedCredits: CreditEcheanceDTO[] = [];

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['credits']) {
      this.currentPage = 1;
      this.paginate();
    }
  }

  paginate() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedCredits = this.credits.slice(start, start + this.pageSize);
  }

  get maxPage(): number {
    return Math.max(1, Math.ceil(this.credits.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.maxPage }, (_, i) => i + 1);
  }

  changePage(dir: number) {
    const next = this.currentPage + dir;
    if (next >= 1 && next <= this.maxPage) {
      this.currentPage = next;
      this.paginate();
    }
  }

  goPage(p: number) {
    this.currentPage = p;
    this.paginate();
  }

  getPaginationInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.credits.length);
    return `${start}–${end} sur ${this.credits.length}`;
  }

  viewDetails(id: number) {
    this.router.navigate(['/credit-details', id]);
  }

  // ── Helpers CSS classes ──────────────────────────────────────

  getUrgClass(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 'urg-today';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 'urg-demain';
    if (d.urgencyLevel === UrgencyLevel.THIS_WEEK) return 'urg-semaine';
    return '';
  }

  getBarClass(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 'fill-today';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 'fill-demain';
    if (d.urgencyLevel === UrgencyLevel.THIS_WEEK) return 'fill-semaine';
    return '';
  }

  getBarPct(d: CreditEcheanceDTO): number {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 100;
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 75;
    if (d.urgencyLevel === UrgencyLevel.THIS_WEEK) return 40;
    return 10;
  }

  getDaysClass(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 'days-today';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 'days-demain';
    if (d.urgencyLevel === UrgencyLevel.THIS_WEEK) return 'days-semaine';
    return '';
  }

  getDaysLabel(d: CreditEcheanceDTO): string {
    if (d.daysUntilEnd === 0) return 'J0';
    return `J-${d.daysUntilEnd}`;
  }

  getUrgLabel(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 'Aujourd\'hui';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 'Demain';
    if (d.urgencyLevel === UrgencyLevel.THIS_WEEK) return 'Cette semaine';
    return 'Futur';
  }

  getEchClass(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return 'ech-today';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return 'ech-demain';
    return 'ech-semaine';
  }

  getEchLabel(d: CreditEcheanceDTO): string {
    if (d.urgencyLevel === UrgencyLevel.TODAY)     return '🔴 Aujourd\'hui';
    if (d.urgencyLevel === UrgencyLevel.TOMORROW)  return '🟠 Demain';
    return '🔵 Cette semaine';
  }

  getPaidPct(d: CreditEcheanceDTO): number {
    return d.paidPercentage ?? 0;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
