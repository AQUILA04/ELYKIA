import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  ClientRegistration,
  ClientRegistrationService
} from '../../services/client-registration.service';

@Component({
  selector: 'app-client-registrations-list',
  templateUrl: './client-registrations-list.component.html',
  styleUrls: ['./client-registrations-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ClientRegistrationsListComponent implements OnInit, OnDestroy {
  registrations: ClientRegistration[] = [];
  agents: any[] = [];
  loading = false;
  depositFilter: 'all' | 'with' | 'without' = 'all';
  selected: ClientRegistration | null = null;
  activateForm: FormGroup;
  currentDate = new Date();
  lastUpdate = new Date();
  photoPreviewUrl: string | null = null;
  photoPreviewTitle = '';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private registrationService: ClientRegistrationService,
    private alertService: AlertService,
    private fb: FormBuilder
  ) {
    this.activateForm = this.fb.group({
      collector: ['', Validators.required],
      tontineCollector: [''],
      validateInitialDeposit: [true]
    });
  }

  ngOnInit(): void {
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
    this.registrationService.getAgents().subscribe({
      next: (agents) => { this.agents = agents ?? []; },
      error: () => { this.agents = []; }
    });
    this.load();
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  get withDepositCount(): number {
    return this.registrations.filter((r) => r.hasInitialDeposit).length;
  }

  setDepositFilter(filter: 'all' | 'with' | 'without'): void {
    this.depositFilter = filter;
    this.load();
  }

  load(): void {
    this.loading = true;
    const hasDeposit =
      this.depositFilter === 'with' ? true :
      this.depositFilter === 'without' ? false :
      null;
    this.registrationService.list('PENDING', hasDeposit).subscribe({
      next: (rows) => {
        this.registrations = rows;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.alertService.showError('Impossible de charger les inscriptions.');
      }
    });
  }

  openDetail(row: ClientRegistration): void {
    this.selected = row;
    this.activateForm.reset({
      collector: row.collector || '',
      tontineCollector: row.tontineCollector || '',
      validateInitialDeposit: true
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.closePhotoPreview();
  }

  openPhotoPreview(url: string | null | undefined, title: string): void {
    if (!url) {
      return;
    }
    this.photoPreviewUrl = url;
    this.photoPreviewTitle = title;
  }

  closePhotoPreview(): void {
    this.photoPreviewUrl = null;
    this.photoPreviewTitle = '';
  }

  /** Miniature pour liste / vignette (thumb prioritaire, sinon original). */
  listPhotoSrc(row: ClientRegistration): string | null {
    return row.profilPhotoThumbUrl || row.profilPhotoUrl || null;
  }

  /** Miniature détail profil. */
  profilThumbSrc(row: ClientRegistration): string | null {
    return row.profilPhotoThumbUrl || row.profilPhotoUrl || null;
  }

  /** Original pour lightbox profil. */
  profilPreviewSrc(row: ClientRegistration): string | null {
    return row.profilPhotoUrl || row.profilPhotoThumbUrl || null;
  }

  /** Thumb pièce uniquement (pas l’original). */
  cardThumbSrc(row: ClientRegistration): string | null {
    return row.cardPhotoThumbUrl || row.cardPhotoUrl || null;
  }

  /** Original pièce pour lightbox au clic. */
  cardPreviewSrc(row: ClientRegistration): string | null {
    return row.cardPhotoUrl || row.cardPhotoThumbUrl || null;
  }

  getInitials(row: ClientRegistration | null | undefined): string {
    if (!row) {
      return '?';
    }
    const first = (row.firstname || '').trim().charAt(0);
    const last = (row.lastname || '').trim().charAt(0);
    const pair = `${first}${last}`.toUpperCase();
    if (pair.trim()) {
      return pair;
    }
    const fromFull = (row.fullName || '').trim().replace(/\s+/g, ' ');
    if (!fromFull) {
      return '?';
    }
    const parts = fromFull.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return fromFull.slice(0, 2).toUpperCase();
  }

  /** Teinte stable d’avatar (0–5) dérivée du nom. */
  avatarTone(row: ClientRegistration | null | undefined): number {
    const key = `${row?.firstname || ''}|${row?.lastname || ''}|${row?.fullName || ''}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return hash % 6;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.photoPreviewUrl) {
      this.closePhotoPreview();
    }
  }

  activate(): void {
    if (!this.selected || this.activateForm.invalid) {
      this.activateForm.markAllAsTouched();
      return;
    }
    const body = this.activateForm.value;
    this.registrationService.activate(this.selected.clientId, {
      collector: body.collector,
      tontineCollector: body.tontineCollector || undefined,
      validateInitialDeposit: !!body.validateInitialDeposit
    }).subscribe({
      next: () => {
        this.alertService.showSuccess('Inscription validée.');
        this.selected = null;
        this.load();
      },
      error: (err) => {
        this.alertService.showError(err?.error?.message || 'Échec de la validation.');
      }
    });
  }

  reject(): void {
    if (!this.selected) return;
    const reason = window.prompt('Motif du refus :');
    if (!reason || !reason.trim()) {
      return;
    }
    this.registrationService.reject(this.selected.clientId, reason.trim()).subscribe({
      next: () => {
        this.alertService.showSuccess('Inscription refusée.');
        this.selected = null;
        this.load();
      },
      error: (err) => {
        this.alertService.showError(err?.error?.message || 'Échec du refus.');
      }
    });
  }

  agentLabel(agent: any): string {
    const name = `${agent?.firstname || ''} ${agent?.lastname || ''}`.trim();
    return name ? `${name} (${agent?.username})` : (agent?.username || '');
  }
}
