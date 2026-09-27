import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
