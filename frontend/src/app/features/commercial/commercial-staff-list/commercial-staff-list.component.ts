import { Component, ViewEncapsulation } from '@angular/core';
import { CommercialDirectoryService, CommercialStaff, apiErrorMessage } from '../service/commercial-directory.service';
import { AlertService } from '@shared/service/alert.service';
import { CommercialPageBase } from '../commercial-page.base';

@Component({
  selector: 'app-commercial-staff-list',
  templateUrl: './commercial-staff-list.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CommercialStaffListComponent extends CommercialPageBase {
  people: CommercialStaff[] = [];
  search = '';
  loading = true;

  constructor(
    private readonly directory: CommercialDirectoryService,
    private readonly alertService: AlertService
  ) {
    super();
  }

  protected start(): void {
    this.load();
  }

  get filtered(): CommercialStaff[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.people;
    }
    return this.people.filter(person =>
      `${person.name} ${person.phoneNumber ?? ''} ${person.serialNumber ?? ''}`.toLowerCase().includes(term));
  }

  get withPhoto(): number {
    return this.people.filter(person => !!person.photoUrl).length;
  }

  load(): void {
    this.loading = true;
    this.directory.listStaff().subscribe({
      next: people => {
        this.people = people;
        this.loading = false;
        this.markUpdated();
      },
      error: error => {
        this.loading = false;
        this.alertService.showError(apiErrorMessage(error, 'Le personnel n\'a pas pu être chargé.'));
      }
    });
  }
}
