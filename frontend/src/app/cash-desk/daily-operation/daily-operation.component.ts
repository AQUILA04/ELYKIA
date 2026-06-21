import { Component, OnInit } from '@angular/core';
import { CashDeskService } from '../service/cash-desk.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { CreditService } from 'src/app/credit/service/credit.service';
import { UserService } from 'src/app/user/service/user.service';
import { saveAs } from 'file-saver';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-daily-operation',
  templateUrl: './daily-operation.component.html',
  styleUrls: ['./daily-operation.component.scss']
})
export class DailyOperationComponent implements OnInit {
  pagedAccounts: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  totalElement = 0;
  isLoading = true;
  username: string | null = '';
  isCashDeskOpen = false;

  constructor(
    private creditService: CreditService,
    private cashDeskService: CashDeskService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private userService: UserService,
    private tokenStorage: TokenStorageService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.loadCredits();
    this.username = this.userService.getUsername();
    this.checkCashDeskStatus();
  }

  checkCashDeskStatus(): void {
    this.cashDeskService.checkOpenCashDesk().subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          if (response.data === true) {
            this.isCashDeskOpen = true;
          } else {
            this.isCashDeskOpen = false;
            this.spinner.hide();
            alert('La caisse n\'est pas ouverte. Vous allez être redirigé pour l\'ouvrir.');
            this.router.navigate(['open-cashDesk']);
          }
        } else {
          alert(response.message);
        }
        this.spinner.hide();
      },
      (error: any) => {
        console.error('Erreur lors de la vérification de la caisse', error);
        alert('Une erreur est survenue lors de la vérification de la caisse.');
        this.spinner.hide();
      }
    );
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCredits();
  }

  refresh(): void {
    this.loadCredits();
  }

  viewDetails(id: number): void {
    this.router.navigate(['/credit-details', id]);
  }

  onTFJClick(): void {
    this.router.navigate(['/tfj']);
  }

  loadCredits(): void {
    this.isLoading = true;
    this.spinner.show();

    this.creditService.getCreditsByCollector(this.currentPage, this.pageSize).subscribe(
      response => {
        if (response.statusCode === 200) {
          this.pagedAccounts = response.data.content;
          this.totalElement = response.data.page.totalElements;
        } else {
          alert(response.message);
        }
        this.isLoading = false;
        this.spinner.hide();
      },
      error => {
        this.isLoading = false;
        this.spinner.hide();
        alert('Impossible de charger les crédits pour le moment. Veuillez réessayer plus tard.');
      }
    );
  }

  downloadPDF(): void {
    this.spinner.show();
    this.cashDeskService.downloadDailyOperation(this.username).subscribe(
      (response) => {
        const blob = new Blob([response], { type: 'application/pdf' });
        saveAs(blob, `Daily_Operation_${this.username}.pdf`);
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors du téléchargement du fichier PDF', error);
        this.spinner.hide();
      }
    );
  }
}
