import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AssignmentWrite,
  CommercialAccount,
  CommercialAssignment,
  CommercialDirectoryService,
  CommercialStaff,
  apiErrorMessage
} from '../service/commercial-directory.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-commercial-account-history',
  templateUrl: './commercial-account-history.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommercialAccountHistoryComponent implements OnInit, OnDestroy {
  userId = 0;
  account?: CommercialAccount;
  history: CommercialAssignment[] = [];
  people: CommercialStaff[] = [];
  loading = true;
  saving = false;
  currentDate = new Date();
  editingId: number | null = null;
  promoterId: number | null = null;
  startDate = '';
  endDate = '';
  closeDate = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly directory: CommercialDirectoryService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.timer = setInterval(() => this.currentDate = new Date(), 1000);
    this.userId = Number(this.route.snapshot.paramMap.get('userId'));
    this.directory.listStaff().subscribe({
      next: people => this.people = people,
      error: error => {
        this.people = [];
        this.alertService.showError(apiErrorMessage(error, 'L\'annuaire du personnel n\'a pas pu être chargé.'));
      }
    });
    this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  get openAssignment(): CommercialAssignment | undefined {
    return this.history.find(item => !item.endDate);
  }

  load(): void {
    this.loading = true;
    this.directory.listAccounts().subscribe({
      next: accounts => {
        this.account = accounts.find(item => item.userId === this.userId);
      }
    });
    this.directory.history(this.userId).subscribe({
      next: history => {
        this.history = history;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.alertService.showError(apiErrorMessage(error, 'L\'historique n\'a pas pu être chargé.'));
      }
    });
  }

  edit(item: CommercialAssignment): void {
    this.editingId = item.id;
    this.promoterId = item.promoterId;
    this.startDate = item.startDate;
    this.endDate = item.endDate ?? '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.promoterId = null;
    this.startDate = '';
    this.endDate = '';
  }

  save(): void {
    if (!this.promoterId || !this.startDate) {
      this.alertService.showError('Choisissez une personne et une date de début.');
      return;
    }
    const body: AssignmentWrite = {
      promoterId: this.promoterId,
      startDate: this.startDate,
      endDate: this.endDate || null
    };
    this.saving = true;
    const editing = this.editingId;
    const request = editing
      ? this.directory.updateAssignment(editing, body)
      : this.directory.createAssignment(this.userId, body);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.alertService.toastSuccess(editing ? 'Période mise à jour.' : 'Affectation enregistrée.');
        this.load();
      },
      error: error => {
        this.saving = false;
        this.alertService.showError(apiErrorMessage(error, 'L\'affectation n\'a pas pu être enregistrée.'));
      }
    });
  }

  closeCurrent(): void {
    const open = this.openAssignment;
    if (!open || !this.closeDate) {
      this.alertService.showError('Indiquez la date de fin de l\'affectation en cours.');
      return;
    }
    this.saving = true;
    this.directory.updateAssignment(open.id, {
      promoterId: open.promoterId,
      startDate: open.startDate,
      endDate: this.closeDate
    }).subscribe({
      next: () => {
        this.saving = false;
        this.closeDate = '';
        this.alertService.toastSuccess('Affectation clôturée.');
        this.load();
      },
      error: error => {
        this.saving = false;
        this.alertService.showError(apiErrorMessage(error, 'La clôture n\'a pas pu être enregistrée.'));
      }
    });
  }

  remove(item: CommercialAssignment): void {
    this.alertService.showConfirmation(
      'Retirer cette période',
      `Retirer ${item.promoterName} du compte ${item.username} pour cette période ?`,
      'Retirer',
      'Annuler'
    ).then(confirmed => {
      if (!confirmed) {
        return;
      }
      this.directory.deleteAssignment(item.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Période retirée.');
          this.load();
        },
        error: error => this.alertService.showError(apiErrorMessage(error, 'La période n\'a pas pu être retirée.'))
      });
    });
  }
}
