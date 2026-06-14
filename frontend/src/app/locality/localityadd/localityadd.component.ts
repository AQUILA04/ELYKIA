import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocalityService } from '../service/locality.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

@Component({
  selector: 'app-localityadd',
  templateUrl: './localityadd.component.html',
  styleUrls: ['./localityadd.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class LocalityAddComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  localityForm!: FormGroup;
  localityId?: number;
  isLoading = false;
  currentDate = new Date();

  get isEditMode(): boolean {
    return !!this.localityId;
  }

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private localityService: LocalityService,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.initForm();
    this.route.params.subscribe(params => {
      this.localityId = params['id'] ? +params['id'] : undefined;
      if (this.localityId) {
        this.loadLocality(this.localityId);
      }
    });

    this.localityForm.get('name')?.valueChanges.subscribe(value => {
      if (typeof value === 'string') {
        this.localityForm.get('name')?.setValue(value.toUpperCase(), { emitEvent: false });
      }
    });

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  initForm(): void {
    this.localityForm = this.formBuilder.group({
      name: ['', Validators.required]
    });
  }

  loadLocality(id: number): void {
    this.isLoading = true;
    this.localityService.getLocalityById(id).subscribe({
      next: (response: { data: { name: string } }) => {
        this.localityForm.patchValue({ name: response.data.name });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la localité', error);
        this.alertService.showError('Erreur lors du chargement de la localité');
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.localityForm.invalid) {
      this.localityForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = { ...this.localityForm.value, id: this.localityId };
    const request$ = this.localityId
      ? this.localityService.updateLocality(formData)
      : this.localityService.addLocality(formData);

    request$.subscribe({
      next: () => {
        this.alertService.showSuccess(
          this.localityId ? 'Localité mise à jour avec succès' : 'Localité ajoutée avec succès'
        );
        this.router.navigate(['/localitylist']);
      },
      error: (error) => {
        const errorMessage = error?.error?.message
          || (this.localityId ? 'Erreur lors de la mise à jour de la localité' : 'Erreur lors de l\'ajout de la localité');
        this.alertService.showError(errorMessage);
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/localitylist']);
  }
}
