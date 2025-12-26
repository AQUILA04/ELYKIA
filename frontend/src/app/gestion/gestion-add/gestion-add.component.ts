import { Component, OnInit } from '@angular/core';
import { GestionService } from '../service/gestion.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-gestion-add',
  templateUrl: './gestion-add.component.html',
  styleUrls: ['./gestion-add.component.scss']
})
export class GestionAddComponent implements OnInit {
  agencyForm!: FormGroup;
  gestionId?: number;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private gestionService: GestionService,
    private router: Router,
    private alertService: AlertService,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.initForm();
    this.route.params.subscribe(params => {
      this.gestionId = +params['id'];
      if (this.gestionId) {
        this.loadGestion(this.gestionId);
      }
    });
    this.agencyForm.get('name')?.valueChanges.subscribe(value => {
      this.agencyForm.get('name')?.setValue(value.toUpperCase(), { emitEvent: false });
    });
  }

  initForm(): void {
    this.agencyForm = this.formBuilder.group({
      name: ['', Validators.required],
      code: [''],
      phone: ['', Validators.required],
      secretaryName: [''],
      secretaryContact: [''],
      superviserName: [''],
      superviserContact: ['']
    });
  }

  loadGestion(id: number): void {
    this.gestionService.getGestionById(id).subscribe(
      (response: any) => {
        const gestion = response.data; 
        this.agencyForm.patchValue({
          name: gestion.name || '',
          code: gestion.code || '',
          phone: gestion.phone || '',
          secretaryName: gestion.secretaryName || '',
          secretaryContact: gestion.secretaryContact || '',
          superviserName: gestion.superviserName || '',
          superviserContact: gestion.superviserContact || ''
        });
      },
      error => {
        console.error('Erreur lors du chargement de la gestion', error);
      }
    );
  }

  onSubmit(): void {
    if (this.agencyForm.valid) {
      this.spinner.show();
      this.isLoading = true;
      const formData = this.agencyForm.value;
      formData.id = this.gestionId;

      if (this.gestionId) {
        this.gestionService.updateGestion(this.gestionId, formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Gestion mise à jour avec succès');
            this.isLoading = false;
            this.router.navigate(['/gestion-list']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de la mise à jour de la gestion';
            this.alertService.showError(errorMessage);
            this.isLoading = false;
          }
        );
      } else {
        this.gestionService.addGestion(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Gestion ajoutée avec succès');
            this.router.navigate(['/gestion-list']);
          },
          error => {
            this.spinner.hide();
            const errorMessage = error?.error?.message || 'Erreur lors de l\'ajout de la gestion';
            this.alertService.showError(errorMessage);
          }
        );
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/gestion-list']);
  }
}