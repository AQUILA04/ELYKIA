import { Component, OnInit } from '@angular/core';
import { CashDeskService } from '../service/cash-desk.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { NgxPermissionsService } from 'ngx-permissions';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/service/auth.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-open-cash-desk',
  templateUrl: './open-cash-desk.component.html',
  styleUrls: ['./open-cash-desk.component.scss']
})
export class OpenCashDeskComponent implements OnInit {
  isCashDeskOpen = false;
  username: string = '';
  isLoading = false;

  constructor(
    private cashDeskService: CashDeskService,
    private spinner: NgxSpinnerService,
    private authService : AuthService,
    private tokenStorage : TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.username = this.authService.getCurrentUser().username;
    this.checkCashDeskStatus();
  }

  checkCashDeskStatus(): void {
    this.cashDeskService.checkOpenCashDesk().subscribe(
      response => {
        this.spinner.show();
        if (response.data === true) {
          this.isCashDeskOpen = true;
        } else {
          this.isCashDeskOpen = false;
        }
        this.spinner.hide();
      },
      error => {
        console.error('Erreur lors de la vérification de la caisse', error);
        this.spinner.hide();
      }
    );
  }

  openCashDesk(): void {
    this.spinner.show();
    this.isLoading = true;
    this.cashDeskService.openCashDesk().subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          this.alertService.showDefaultSucces('La caisse a été ouverte avec succès !');
          this.isCashDeskOpen = true;
        } else {
          this.alertService.showDefaultError(response.message);
        }
        this.isLoading = false;
        this.spinner.hide();
      },
      (error: any) => {
        console.log('ERROR:', JSON.stringify(error));
        this.alertService.showDefaultError('Une erreur est survenue lors de l\'ouverture de la caisse : '+ error.error.message);
        this.isLoading = false;
        this.spinner.hide();
      }
    );
  }

  closeCashDesk(): void {
    this.alertService.showConfirmation('Confirmation !', 'Voulez-vous fermer la caisse pour l\'utilisateur : ' + this.username + '?', 'Oui, fermer!', 'Annuler')
    .then(result => {
      if (result) {
        this.spinner.show();
        this.isLoading = true;
        this.cashDeskService.closeCashDesk().subscribe(
          () => {
            this.alertService.showDefaultSucces('La caisse a été fermée avec succès !');
            this.isCashDeskOpen = false;
            this.isLoading = false;
            this.spinner.hide();
          },
          error => {
            console.log('ERROR:', JSON.stringify(error));
            this.alertService.showDefaultError('Erreur lors de la fermeture de la caisse !');
            this.isLoading = false;
            this.spinner.hide();
          }
        );
      }
    });
  }
}
