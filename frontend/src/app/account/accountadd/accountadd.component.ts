import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountService } from '../service/account.service';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AuthService } from '../../auth/service/auth.service';

@Component({
  selector: 'app-account-add',
  templateUrl: './accountadd.component.html',
  styleUrls: ['./accountadd.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AccountAddComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  accountForm!: FormGroup;
  clients: any[] = [];
  isLoading = false;
  accountId?: number;
  accountNumberExists = false;
  accountNumber = '';
  currentDate = new Date();

  get isEditMode(): boolean {
    return !!this.accountId;
  }

  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
  };

  constructor(
    private formBuilder: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private clientService: ClientService,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.accountForm = this.formBuilder.group({
      accountNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      clientId: ['', Validators.required],
      accountBalance: ['', [Validators.required, Validators.min(500), Validators.max(2000000)]]
    });
  }

  ngOnInit(): void {
    this.loadClients();

    this.route.params.subscribe(params => {
      this.accountId = params['id'] ? +params['id'] : undefined;
      if (this.accountId) {
        this.loadAccount(this.accountId);
      } else {
        this.route.queryParams.subscribe(queryParams => {
          const totalAccounts = queryParams['totalAccounts'] ? +queryParams['totalAccounts'] : 0;
          const nextAccountNumber = (totalAccounts + 1).toString().padStart(4, '0');
          const generatedAccountNumber = `002102${nextAccountNumber}`;
          this.accountNumber = generatedAccountNumber;
          this.accountForm.patchValue({ accountNumber: generatedAccountNumber });
        });
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

  checkAccountNumberUnique(accountNumber: string): void {
    this.accountService.checkAccountNumberExists(accountNumber).subscribe({
      next: (exists) => {
        this.accountNumberExists = exists;
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du numéro de compte', error);
      }
    });
  }

  loadClients(): void {
    const currentUser = this.authService.getCurrentUser();
    this.clientService.getClients(0, 100000, 'id,desc', currentUser).subscribe({
      next: (data) => {
        this.clients = data.data.content;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des clients', error);
        this.alertService.showError('Erreur lors du chargement des clients');
      }
    });
  }

  loadAccount(accountId: number): void {
    this.isLoading = true;
    this.accountService.getAccountById(accountId).subscribe({
      next: (res) => {
        const account = res.data;
        this.accountForm.patchValue({
          accountNumber: account.accountNumber,
          clientId: account.client.id,
          accountBalance: account.accountBalance
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du compte', error);
        this.alertService.showError('Erreur lors du chargement du compte');
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid || this.accountNumberExists) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = { ...this.accountForm.value };

    if (this.accountId) {
      this.accountService.updateAccount(this.accountId, formData).subscribe({
        next: () => {
          this.alertService.showSuccess('Compte mis à jour avec succès');
          this.router.navigate(['/accountlist']);
        },
        error: () => {
          this.alertService.showError('Erreur lors de la mise à jour du compte');
          this.isLoading = false;
        }
      });
    } else {
      this.accountService.addAccount(formData).subscribe({
        next: () => {
          this.alertService.showSuccess('Compte ajouté avec succès');
          this.router.navigate(['/accountlist']);
        },
        error: () => {
          this.alertService.showError('Erreur lors de l\'ajout du compte');
          this.isLoading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/accountlist']);
  }
}
