import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { AccountingDayService } from './service/accounting-day.service';
import { TokenStorageService } from '../shared/service/token-storage.service';
import { NgxPermissionsService } from 'ngx-permissions';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from '../shared/service/alert.service';
import {AuthService} from "../auth/service/auth.service";

@Component({
  selector: 'app-accounting-day',
  templateUrl: './accounting-day.component.html',
  styleUrls: ['./accounting-day.component.scss']
})
export class AccountingDayComponent implements OnInit {
  openDate: string = '';
  closeDate: string = '';
  isOpen: boolean = false;
  accountingDate: Date| string = '';
  openCashDesks: any[] = [];


  constructor(private accountingDayService: AccountingDayService,
              private tokenStorage: TokenStorageService,
              private permissionsService: NgxPermissionsService,
              private spinner : NgxSpinnerService,
              private alertService: AlertService,
              private authService: AuthService

  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.checkIfDayIsOpened();
    this.getOpenCashDesks();
    const currentUser = this.authService.getCurrentUser();
    this.permissionsService.loadPermissions(currentUser.roles);
  }

  getOpenCashDesks(): void {
    this.spinner.show();
    this.accountingDayService.getOpenCashDesks().subscribe(
      (response: any) => {
        this.spinner.hide();
        if (response.status === 'OK' && response.statusCode === 200) {
          this.openCashDesks = response.data;
        } else {
          this.alertService.showError('Erreur', response.message);
        }
      },
      error => {
        this.spinner.hide();
        this.alertService.showError('Erreur', 'Erreur lors de la récupération des caisses ouvertes');
      }
    );
  }

  checkIfDayIsOpened(): void {
    this.spinner.show();
    this.accountingDayService.isDayOpened().subscribe(
      (response: any) => {
        this.spinner.hide();
        if (response.status === 'OK' && response.statusCode === 200) {
          this.isOpen = response.data.status as boolean;
          this.accountingDate = this.isOpen ? this.formatDate(response.data.accountingDate) : this.formatDate(new Date());
        } else {
          alert(response.message);
        }
      },
      error => {
        this.spinner.hide();
      }
    );
  }
  currentDay(): void {
    this.spinner.show();
    this.accountingDayService.getCurrentDay().subscribe(
      (response: any) => {
        this.spinner.hide();
        if (response.status === 'OK' && response.statusCode === 200) {
          this.accountingDate = typeof response.data === 'string'
          ? response.data
          :new Date(response.data).toISOString().split('T')[0];
        } else {
          alert(response.message);
        }
      },
      error => {
        this.spinner.hide();

      }
    );
  }
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  openDay(): void {
    if (this.isOpen) {
      this.alertService.showError('Erreur', 'La journée comptable est déjà ouverte.');
      return;
    }

    this.accountingDayService.openDay(this.openDate).subscribe(
      response => {
        if (response.statusCode === 200) {
          this.alertService.showDefaultSucces('La journée comptable a été ouverte avec succès');
          this.isOpen = true;
        } else {
          alert(response.message);
          this.alertService.showDefaultError(response.message || 'Erreur lors de l\'ouverture de la journée comptable');
        }
      },
      error => {
        if (error.status === 500 && error.error.message === 'Cette Journée comptable à déjà été ouverte !') {
          this.alertService.showDefaultError('Cette Journée comptable est déjà ouverte !');
        } else {

          this.alertService.showDefaultError('Erreur lors de l\'ouverture de la journée comptable');
        }
      }
    );
  }

  closeDay(): void {
    if (!this.isOpen) {
      this.spinner.show();
      this.alertService.showDefaultError('La journée comptable est déjà fermée !');
      return;
    }

    this.accountingDayService.closeDay(this.closeDate).subscribe(
      response => {
        if (response.statusCode === 200) {
          this.spinner.hide();
          this.alertService.showDefaultSucces('La journée comptable a été fermée avec succès');
          this.isOpen = false;
        } else {
          this.alertService.showDefaultError(response.message || 'Erreur lors de la fermeture de la journée comptable');
        }
      },
      error => {
        this.spinner.hide();
        if (error.status === 500 && error.error.message === 'Cette Journée comptable est déjà fermée !') {
          this.alertService.showDefaultError('Cette Journée comptable est déjà fermée !');
        } else {
          this.alertService.showDefaultError('Erreur lors de la fermeture de la journée comptable');
        }
      }
    );
  }
}
