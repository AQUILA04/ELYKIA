import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DepositService } from '../service/deposit.service';
import { GestionService } from 'src/app/gestion/service/gestion.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';



@Component({
  selector: 'app-deposit-add',
  templateUrl: './deposit-add.component.html',
  styleUrls: ['./deposit-add.component.scss']
})
export class DepositAddComponent implements OnInit {
  depositForm: FormGroup;
  agencies: any[] = [];
  deposit: any[]=[]

  constructor(
    private formBuilder: FormBuilder,
    private depositService: DepositService,
    private gestionService: GestionService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage : TokenStorageService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.depositForm = this.formBuilder.group({
      agencyId: ['', Validators.required],
      totalAmount: ['', Validators.required],
      depositStatus: ['', Validators.required],
      irregularityAmount: [''],
      balance: ['']
    });
  }

  ngOnInit(): void {
    this.loadAgencies();
  }

  loadAgencies(): void {
    this.spinner.show();
    this.gestionService.getAllGestion().subscribe(
      (response) => {
        console.log('API Response:', response); 
        if (response && response.data && Array.isArray(response.data.content)) {
          this.agencies = response.data.content; 
        } else {
          console.error('Unexpected API response format:', response);
        }
        this.spinner.hide();
      },
      (error) => {
        console.error('Erreur lors du chargement des agences', error);
        this.spinner.hide();
      }
    );
  }
  
  
  onSubmit(): void {
    if (this.depositForm.valid) {
      this.depositService.addDeposit(this.deposit).subscribe(
        response => {
          console.log('Deposit added successfully', response);
        },
        error => {
          console.error('Error adding deposit', error);
        }
      );
    }
  }

  onCancel(): void {
    this.router.navigate(['/operation-list']); 
  }
}