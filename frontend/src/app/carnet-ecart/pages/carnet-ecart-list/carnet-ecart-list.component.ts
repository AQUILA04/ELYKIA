import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { CarnetEcartService } from '../../services/carnet-ecart.service';
import {
  CarnetEcartBulkResult,
  CarnetEcartDomain,
  CarnetEcartItem,
  CarnetEcartQueue
} from '../../models/carnet-ecart.model';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';

@Component({
  selector: 'app-carnet-ecart-list',
  templateUrl: './carnet-ecart-list.component.html',
  styleUrls: ['./carnet-ecart-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CarnetEcartListComponent implements OnInit, OnDestroy {
  items: CarnetEcartItem[] = [];
  selected = new Set<string>();
  queue: CarnetEcartQueue = 'PENDING';
  domain: CarnetEcartDomain | '' = '';
  commercial = '';
  loading = false;
  acting = false;
  errorMessage = '';
  resultMessage = '';
  currentDate = new Date();
  lastUpdate = new Date();
  showReject = false;
  rejectNote = '';
  pendingKeys: string[] = [];
  showAccept = false;
  acceptPreviewAmount = 0;

  private clock?: ReturnType<typeof setInterval>;

  readonly monthLabels = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  constructor(
    private carnetEcartService: CarnetEcartService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.clock = setInterval(() => this.currentDate = new Date(), 1000);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
  }

  get canFilterCommercial(): boolean {
    return this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
  }

  get pendingCount(): number {
    return this.items.filter(item => item.acceptableAmount > 0).length;
  }

  get acceptableTotal(): number {
    return this.items.reduce((sum, item) => sum + (item.acceptableAmount || 0), 0);
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(item => this.selected.has(item.key));
  }

  get selectedKeys(): string[] {
    return Array.from(this.selected);
  }

  get inverseSelectedCount(): number {
    return this.items.filter(item => this.selected.has(item.key) && (item.acceptableAmount || 0) <= 0).length;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.selected.clear();
    const commercial = this.canFilterCommercial ? this.commercial.trim() : undefined;
    this.carnetEcartService.list(this.queue, this.domain, commercial).subscribe({
      next: items => {
        this.items = items || [];
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'La liste des écarts n’a pas pu être chargée.';
      }
    });
  }

  toggleAll(checked: boolean): void {
    this.selected.clear();
    if (checked) {
      this.items.forEach(item => this.selected.add(item.key));
    }
  }

  toggle(key: string, checked: boolean): void {
    if (checked) {
      this.selected.add(key);
    } else {
      this.selected.delete(key);
    }
  }

  askAccept(keys: string[]): void {
    if (!keys.length) {
      return;
    }
    this.pendingKeys = keys;
    this.acceptPreviewAmount = this.items
      .filter(item => keys.includes(item.key))
      .reduce((sum, item) => sum + (item.acceptableAmount || 0), 0);
    this.showAccept = true;
    this.showReject = false;
  }

  confirmAccept(): void {
    this.showAccept = false;
    this.run(this.carnetEcartService.accept(this.pendingKeys));
  }

  askReject(keys: string[]): void {
    if (!keys.length) {
      return;
    }
    this.pendingKeys = keys;
    this.rejectNote = '';
    this.showReject = true;
    this.showAccept = false;
  }

  confirmReject(): void {
    const note = this.rejectNote.trim();
    if (!note) {
      this.errorMessage = 'Indiquez le motif du rejet.';
      return;
    }
    this.showReject = false;
    this.run(this.carnetEcartService.reject(this.pendingKeys, note));
  }

  cancelDialog(): void {
    this.showAccept = false;
    this.showReject = false;
    this.pendingKeys = [];
  }

  domainLabel(item: CarnetEcartItem): string {
    return item.domain === 'TONTINE' ? 'Tontine' : 'Vente';
  }

  directionLabel(item: CarnetEcartItem): string {
    if (item.direction === 'SYSTEM_ABOVE_NOTEBOOK') {
      return 'Système supérieur';
    }
    if (item.direction === 'MIXED') {
      return 'Écarts des deux sens';
    }
    return 'Carnet supérieur';
  }

  monthLabel(month: number, year: number): string {
    return `${this.monthLabels[month] || month} ${year}`;
  }

  private run(request: Observable<CarnetEcartBulkResult>): void {
    this.acting = true;
    this.errorMessage = '';
    this.resultMessage = '';
    request.subscribe({
      next: (result: CarnetEcartBulkResult) => {
        this.acting = false;
        this.resultMessage = this.summarize(result);
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.acting = false;
        this.errorMessage = err?.error?.message || 'Le traitement n’a pas abouti.';
      }
    });
  }

  private summarize(result: CarnetEcartBulkResult): string {
    const ok = result?.succeeded?.length || 0;
    const ignored = result?.ignored?.length || 0;
    const errors = result?.errors?.length || 0;
    const parts = [`${ok} traité(s)`];
    if (ignored) {
      parts.push(`${ignored} ignoré(s) : le carnet n’est pas supérieur au système`);
    }
    if (errors) {
      const first = result.errors[0]?.message;
      parts.push(`${errors} en erreur${first ? ' — ' + first : ''}`);
    }
    return parts.join(' · ');
  }
}
