import { Component, OnInit } from '@angular/core';
import { CashDeskService } from '../service/cash-desk.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { CreditService } from 'src/app/credit/service/credit.service';
import { UserService } from 'src/app/user/service/user.service';
import { saveAs } from 'file-saver';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator'; // Utiliser le type PageEvent pour plus de clarté

@Component({
  selector: 'app-daily-operation',
  templateUrl: './daily-operation.component.html',
  styleUrls: ['./daily-operation.component.scss']
})
export class DailyOperationComponent implements OnInit {
  credits: any[] = [];
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

  updatePagedAccounts(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedAccounts = this.credits?.slice(start, end);
  }

  // MODIFIÉ : La méthode met maintenant à jour la vue
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedAccounts(); // Cette ligne rafraîchit la page affichée
  }

  refresh(): void {
    this.loadCredits();
  }

  viewDetails(id: number): void {
    // Note : Cette route semble pointer vers 'account-details' et non 'credit-details'
    this.router.navigate(['/credit-details', id]);
  }

  onTFJClick(): void {
    this.router.navigate(['/tfj']);
  }

  loadCredits(): void {
    this.isLoading = true;
    this.spinner.show();

    // Cette méthode charge TOUS les crédits pour la pagination côté client
    this.creditService.getCreditsByCollector().subscribe(
      response => {
        if (response.statusCode === 200) {
          this.credits = response.data.content;
          // MODIFIÉ : Le total est la longueur du tableau reçu
          this.totalElement = this.credits.length;
          this.updatePagedAccounts();
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
