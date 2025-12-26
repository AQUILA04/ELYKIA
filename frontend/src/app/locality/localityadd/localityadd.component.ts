import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocalityService, Locality } from '../service/locality.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-localityadd',
  templateUrl: './localityadd.component.html',
  styleUrls: ['./localityadd.component.scss']
})
export class LocalityAddComponent implements OnInit {
  localityForm!: FormGroup;
  localityId?: number;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private localityService: LocalityService,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage : TokenStorageService,
    private spinner: NgxSpinnerService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.route.params.subscribe(params => {
      this.localityId = +params['id'];
      if (this.localityId) {
        this.loadLocality(this.localityId);
      }
    });
        // Transform text to uppercase on form value changes
        this.localityForm.get('name')?.valueChanges.subscribe(value => {
          this.localityForm.get('name')?.setValue(value.toUpperCase(), { emitEvent: false });
        });
  }

  initForm(): void {
    this.localityForm = this.formBuilder.group({
      name: ['', Validators.required]
    });
  }

  loadLocality(id: number): void {
    this.localityService.getLocalityById(id).subscribe(
      (response: any) => { 
        const locality = response.data; 
        this.localityForm.patchValue({
          name: locality.name
        });
      },
      error => {
        console.error('Erreur lors du chargement de la localité', error);
      }
    );
  }

  onSubmit(): void {
    if (this.localityForm.valid) {
      this.spinner.show();
      this.isLoading = true;
      const formData = this.localityForm.value;
      formData.id = this.localityId; 

      if (this.localityId) {
        this.localityService.updateLocality(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Localité mise à jour avec succès');
            this.isLoading= false;
            this.router.navigate(['/localitylist']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de la mise à jour de la localité';
            this.alertService.showError(errorMessage);
          }
        );
      } else {
        this.localityService.addLocality(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Localité ajoutée avec succès');
            this.router.navigate(['/localitylist']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de l\'ajout de la localité';
            this.alertService.showError(errorMessage);
          }
        );
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/localitylist']);
  }
}
