import { Component, OnInit } from '@angular/core';
import { CashDeskService } from '../service/cash-desk.service';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-close-cash-desk',
  templateUrl: './close-cash-desk.component.html',
  styleUrls: ['./close-cash-desk.component.scss']
})
export class CloseCashDeskComponent implements OnInit {
  isLoading = false;
  username: string = ''; 

  constructor(
    private cashDeskService: CashDeskService,
    private spinner: NgxSpinnerService,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getCurrentUser().username;

  }

  closeCashDesk(): void {
    this.alertService.showConfirmation('Confirmation !', 'Voulez-vous fermer la caisse?', 'Oui, fermer!', 'Annuler')
    .then(result => {
      if (result) {
        this.spinner.show();
        this.isLoading = true;
        this.cashDeskService.closeCashDesk().subscribe(
          () => {
            this.alertService.showDefaultSucces('La caisse a été fermée avec succès !');
            this.isLoading = false;
            this.spinner.hide();
          },
          error => {
            this.alertService.showDefaultError('Erreur lors de la fermeture de la caisse');
            this.isLoading = false;
            this.spinner.hide();
          }
        );
      }
    });
  }
}
