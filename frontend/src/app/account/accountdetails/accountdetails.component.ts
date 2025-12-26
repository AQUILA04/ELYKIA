import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, Account } from '../service/account.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-accountdetails',
  templateUrl: './accountdetails.component.html',
  styleUrls: ['./accountdetails.component.scss']
})
export class AccountdetailsComponent implements OnInit {
  account: Account | undefined;
  isLoading = true;
  accountId?: number;

  constructor(
    private route: ActivatedRoute,
    private accountService: AccountService,
    private router : Router,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const accountId = +params['id'];
      this.loadAccount(accountId);
    });
  }
  onCancel(): void {
    this.router.navigate(['/accountlist']);
  }
  navigateToEdit(accountId: number): void {
    this.router.navigate(['/account-add', accountId]);
  }

  loadAccount(accountId: number): void {
    this.spinner.show();
    this.accountService.getAccountById(accountId).subscribe(
      (response: any) => {
        if (response && response.data) {
          this.spinner.hide();
          this.account = response.data;
          this.isLoading = false;
        } else {
          console.error('Réponse inattendue de l\'API:', response);
          this.isLoading = false;
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors de la récupération des détails du compte', error);
        this.isLoading = false;
      }
    );
  }
}
