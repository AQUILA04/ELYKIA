import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CreditLateDTO } from '../../../models/credit-late.model';

@Component({
  selector: 'app-credit-late-table',
  templateUrl: './credit-late-table.component.html',
  styleUrls: ['./credit-late-table.component.scss'],
  standalone: false
})
export class CreditLateTableComponent implements OnChanges {
  @Input() credits: CreditLateDTO[] = [];
  @Input() isLoading: boolean = false;
  @Input() currentPage: number = 1;
  @Input() isRecoveryManager: boolean = false;
  @Input() isFieldControlBusy: boolean = false;
  @Output() pageChanged = new EventEmitter<number>();
  @Output() closeCredit = new EventEmitter<CreditLateDTO>();
  @Output() fieldControl = new EventEmitter<CreditLateDTO>();
  @Output() selectionChanged = new EventEmitter<CreditLateDTO[]>();
  pageSize: number = 8;
  paginatedCredits: CreditLateDTO[] = [];
  maxPage: number = 1;

  allSelected: boolean = false;

  constructor(private router: Router) {}

  get pageSelectedCount(): number {
    return this.paginatedCredits.filter(c => c.selected).length;
  }

  get someSelected(): boolean {
    const count = this.pageSelectedCount;
    return count > 0 && count < this.paginatedCredits.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['credits'] || changes['currentPage']) {
      this.updatePagination();
      this.syncAllSelectedState();
    }
  }

  toggleSelectAll(event: any): void {
    this.allSelected = event.checked;
    this.paginatedCredits.forEach(c => c.selected = this.allSelected);
    this.emitSelection();
  }

  onSelectionChange(): void {
    this.syncAllSelectedState();
    this.emitSelection();
  }

  private syncAllSelectedState(): void {
    this.allSelected = this.paginatedCredits.length > 0 && this.paginatedCredits.every(c => c.selected);
  }

  private emitSelection(): void {
    this.selectionChanged.emit(this.credits.filter(c => c.selected));
  }

  updatePagination() {
    this.maxPage = Math.ceil(this.credits.length / this.pageSize);
    if (this.maxPage === 0) this.maxPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedCredits = this.credits.slice(start, start + this.pageSize);
  }

  changePage(delta: number) {
    this.currentPage = Math.max(1, Math.min(this.maxPage, this.currentPage + delta));
    this.pageChanged.emit(this.currentPage);
    this.updatePagination();
  }

  goPage(p: number) {
    this.currentPage = p;
    this.pageChanged.emit(this.currentPage);
    this.updatePagination();
  }

  viewDetails(creditId: number) {
    this.router.navigate(['/credit/details', creditId]);
  }

  getGraviteClass(d: CreditLateDTO): string {
    const days = Math.max(d.lateDaysDelai, d.lateDaysEcheance);
    if (days >= 30) return 'row-critique';
    if (days >= 15) return 'row-grave';
    if (days >= 7)  return 'row-moyen';
    return 'row-faible';
  }

  getBarClass(d: CreditLateDTO): string {
    const days = Math.max(d.lateDaysDelai, d.lateDaysEcheance);
    if (days >= 30) return 'fill-critique';
    if (days >= 15) return 'fill-grave';
    if (days >= 7)  return 'fill-moyen';
    return 'fill-faible';
  }

  getDaysClass(d: CreditLateDTO): string {
    const days = Math.max(d.lateDaysDelai, d.lateDaysEcheance);
    if (days >= 30) return 'days-critique';
    if (days >= 15) return 'days-grave';
    if (days >= 7)  return 'days-moyen';
    return 'days-faible';
  }

  getLateDays(d: CreditLateDTO): number {
    return Math.max(d.lateDaysDelai, d.lateDaysEcheance);
  }

  getGraviteLabel(d: CreditLateDTO): string {
    const days = this.getLateDays(d);
    if (days >= 30) return 'Critique';
    if (days >= 15) return 'Grave';
    if (days >= 7)  return 'Moyen';
    return 'Faible';
  }

  getBarPct(d: CreditLateDTO): number {
    return Math.min(100, Math.round(this.getLateDays(d) / 90 * 100));
  }

  getInitials(collector: string): string {
    if (!collector) return '';
    return collector.split('.').map(p => p[0].toUpperCase()).join('').substring(0, 2);
  }

  isDateOverdue(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  getPaidPct(d: CreditLateDTO): number {
    if (!d.totalAmount || d.totalAmount === 0) return 0;
    return Math.round((d.totalAmountPaid / d.totalAmount) * 100);
  }

  getPaginationInfo(): string {
    if (this.credits.length === 0) return '0 résultat';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.credits.length);
    return `${start}–${end} sur ${this.credits.length}`;
  }
}
