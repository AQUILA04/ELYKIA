import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountService, Account } from '../service/account.service';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import {AuthService} from "../../auth/service/auth.service";


@Component({
  selector: 'app-account-add',
  templateUrl: './accountadd.component.html',
  styleUrls: ['./accountadd.component.scss']
})
export class AccountAddComponent implements OnInit {
  accountForm!: FormGroup;
  clients: any[] = [];
  isLoading = false;
  accountId?: number;
  clientId?: number;
  accountNumberExists = false;
  accountNumber: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private clientService: ClientService,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.accountForm = this.formBuilder.group({
      accountNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]], // Mise à jour de la validation
      clientId: ['', Validators.required],
      accountBalance: ['', [Validators.required, Validators.min(500), Validators.max(2000000)]]
    });
  }
// AJOUTEZ CETTE FONCTION
  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
  }

  ngOnInit(): void {
    this.spinner.show();
    this.loadClients();
    this.spinner.hide();
    this.route.params.subscribe(params => {
      this.accountId = +params['id'];
      if (this.accountId) {
        this.loadAccount(this.accountId);
      } else {
        // C'est une création, générer le numéro de compte
        this.route.queryParams.subscribe(queryParams => {
          const totalAccounts = queryParams['totalAccounts'] ? +queryParams['totalAccounts'] : 0;
          const nextAccountNumber = (totalAccounts + 1).toString().padStart(4, '0');
          const generatedAccountNumber = `002102${nextAccountNumber}`;
          this.accountNumber = generatedAccountNumber;
          this.accountForm.patchValue({ accountNumber: generatedAccountNumber });
          // Optionnel: rendre le champ readonly si vous ne voulez pas que l'utilisateur le modifie
           this.accountForm.get('accountNumber')?.disable();
        });
      }
    });
  }
  checkAccountNumberUnique(accountNumber: string): void {
    this.accountService.checkAccountNumberExists(accountNumber).subscribe(
      exists => {
        this.accountNumberExists = exists;
      },
      error => {
        console.error('Erreur lors de la vérification du numéro de compte', error);
      }
    );
  }

  loadClients(): void {
    const currentUser = this.authService.getCurrentUser();
    this.spinner.show();
    this.clientService.getClients(0, 100000, 'id,desc', currentUser).subscribe(
      (data) => {
        this.spinner.show();
        this.clients = data.data.content;
        this.spinner.hide();
      },
      (error) => {
        console.error('Erreur lors du chargement des clients', error);
      }
    );
  }


  loadAccount(accountId: number): void {
    console.log('Account ID', accountId);
    this.accountService.getAccountById(accountId).subscribe(
      res => {
        const account = res.data;
        console.log('Account', account);
        this.accountForm.patchValue({
          accountNumber: account.accountNumber,
          clientId: account.client.id,
          accountBalance: account.accountBalance
        });
      },
      error => {
        console.error('Erreur lors du chargement du compte', error);
      }
    );
  }

  onSubmit(): void {
    if (this.accountForm.valid && !this.accountNumberExists) {
      this.isLoading = true;
      const formData = this.accountForm.value;

      if (this.accountId) {
        this.spinner.show();
        this.accountService.updateAccount(this.accountId, formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Compte mis à jour avec succès');
            this.isLoading = false;
            this.router.navigate(['/accountlist']);
          },
          error => {
            this.spinner.hide();
            this.alertService.showError('Erreur lors de la mise à jour du compte');
            this.isLoading = false;
          }
        );
      } else {
        console.log('account Number', this.accountNumber);
        formData.accountNumber = this.accountNumber;
        this.accountService.addAccount(formData).subscribe(
          response => {
            this.spinner.hide();
            this.alertService.showSuccess('Compte ajouté avec succès');
            this.isLoading = false;
            this.router.navigate(['/accountlist']);
          },
          error => {
            this.spinner.hide();
            this.alertService.showError('Erreur lors de l\'ajout du compte');
            this.isLoading = false;
          }
        );
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/accountlist']);
  }
}
