import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommercialDirectoryService, CommercialStaff, apiErrorMessage } from '../service/commercial-directory.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-commercial-staff-list',
  templateUrl: './commercial-staff-list.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommercialStaffListComponent implements OnInit, OnDestroy {
  people: CommercialStaff[] = [];
  search = '';
  loading = true;
  currentDate = new Date();
  lastUpdate = new Date();
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly directory: CommercialDirectoryService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.timer = setInterval(() => this.currentDate = new Date(), 1000);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
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
        this.lastUpdate = new Date();
      },
      error: error => {
        this.loading = false;
        this.alertService.showError(apiErrorMessage(error, 'Le personnel n\'a pas pu être chargé.'));
      }
    });
  }
}
