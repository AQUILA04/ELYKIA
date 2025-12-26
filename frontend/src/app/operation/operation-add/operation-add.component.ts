import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperationService } from '../service/operation.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';


@Component({
  selector: 'app-operation-add',
  templateUrl: './operation-add.component.html',
  styleUrls: ['./operation-add.component.scss']
})
export class OperationAddComponent implements OnInit {
  operationForm: FormGroup;
  currentDay: string | undefined;

  constructor(
    private formbuilder: FormBuilder,
    private operationService: OperationService,
    private router: Router,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.operationForm = this.formbuilder.group({
      collection: ['', Validators.required],
      spending: [''],
      balance: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.operationForm.invalid) {
      this.spinner.show();
      return;
    }

    const agencyId = sessionStorage.getItem('agencyId');
    const formData: any = {
      collection: this.operationForm.value.collection,
      spending: this.operationForm.value.spending,
      balance: this.operationForm.value.balance,
      agencyId: 4, 
    };

    if (agencyId) {
      formData['agencyId'] = parseInt(agencyId, 10);
    }

    this.operationService.addOperation(formData).subscribe(
      response => {
        this.spinner.hide();
        this.alertService.showDefaultSucces('Données enregistrées avec succès.');
        this.router.navigate(['/operation-list']);
      },
      error => {
        this.spinner.hide();
        console.error('Error submitting data:', error);
        this.alertService.showDefaultError(error.message);
      }
    );
  }
  onCancel(): void {
    this.router.navigate(['/operation-list']);
  }
}