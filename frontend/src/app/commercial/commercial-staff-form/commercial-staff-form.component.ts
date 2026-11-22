import { Component, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of } from 'rxjs';
import {
  CommercialAssignment,
  CommercialDirectoryService,
  CommercialStaff,
  apiErrorMessage
} from '../service/commercial-directory.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CommercialPageBase } from '../commercial-page.base';

@Component({
  selector: 'app-commercial-staff-form',
  templateUrl: './commercial-staff-form.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CommercialStaffFormComponent extends CommercialPageBase {
  id: number | null = null;
  name = '';
  phoneNumber = '';
  serialNumber = '';
  dateOfBirth = '';
  photoUrl: string | null = null;
  initials = '?';
  assignments: CommercialAssignment[] = [];
  preview: string | null = null;
  photoFile: File | null = null;
  removePhoto = false;
  loading = false;
  saving = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly directory: CommercialDirectoryService,
    private readonly alertService: AlertService
  ) {
    super();
  }

  protected start(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.id = raw ? Number(raw) : null;
    if (this.id) {
      this.load();
    }
  }

  get shownPhoto(): string | null {
    if (this.removePhoto && !this.preview) {
      return null;
    }
    return this.preview || this.photoUrl;
  }

  load(): void {
    if (!this.id) {
      return;
    }
    this.loading = true;
    this.directory.getStaff(this.id).subscribe({
      next: detail => {
        this.apply(detail.person);
        this.assignments = detail.assignments ?? [];
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.alertService.showError(apiErrorMessage(error, 'La fiche n\'a pas pu être chargée.'));
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.alertService.showError('La photo ne doit pas dépasser 5 Mo.');
      input.value = '';
      return;
    }
    this.photoFile = file;
    this.removePhoto = false;
    const reader = new FileReader();
    reader.onload = () => this.preview = String(reader.result);
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.photoFile = null;
    this.preview = null;
    this.removePhoto = true;
  }

  save(): void {
    const name = this.name.trim();
    if (!name) {
      this.alertService.showError('Le nom est obligatoire.');
      return;
    }
    const body = {
      name,
      phoneNumber: this.phoneNumber.trim() || null,
      serialNumber: this.serialNumber.trim() || null,
      dateOfBirth: this.dateOfBirth || null
    };
    this.saving = true;
    const write = this.id
      ? this.directory.updateStaff(this.id, body)
      : this.directory.createStaff(body);
    write.pipe(switchMap(person => this.syncPhoto(person))).subscribe({
      next: person => {
        this.saving = false;
        this.alertService.toastSuccess('Fiche enregistrée.');
        this.router.navigate(['/commercial/staff', person.id]);
        this.id = person.id;
        this.photoFile = null;
        this.preview = null;
        this.removePhoto = false;
        this.load();
      },
      error: error => {
        this.saving = false;
        this.alertService.showError(apiErrorMessage(error, 'La fiche n\'a pas pu être enregistrée.'));
      }
    });
  }

  remove(): void {
    if (!this.id) {
      return;
    }
    void this.alertService.showConfirmation(
      'Retirer cette personne',
      'La fiche sera retirée de l\'annuaire. Ce n\'est possible que si elle n\'a jamais été affectée.',
      'Retirer',
      'Annuler'
    ).then(confirmed => {
      if (!confirmed || !this.id) {
        return;
      }
      this.directory.deleteStaff(this.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Personne retirée.');
          this.router.navigate(['/commercial/staff']);
        },
        error: error => this.alertService.showError(apiErrorMessage(error, 'La personne n\'a pas pu être retirée.'))
      });
    });
  }

  private syncPhoto(person: CommercialStaff) {
    if (this.photoFile) {
      return this.directory.uploadPhoto(person.id, this.photoFile);
    }
    if (this.removePhoto && person.photoUrl) {
      return this.directory.deletePhoto(person.id);
    }
    return of(person);
  }

  private apply(person: CommercialStaff): void {
    this.name = person.name;
    this.phoneNumber = person.phoneNumber ?? '';
    this.serialNumber = person.serialNumber ?? '';
    this.dateOfBirth = person.dateOfBirth ?? '';
    this.photoUrl = person.photoUrl ?? null;
    this.initials = person.initials || '?';
  }
}
