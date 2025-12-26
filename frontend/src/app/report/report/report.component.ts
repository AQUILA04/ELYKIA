import { Component, OnInit } from '@angular/core';
import { ReportService } from '../service/report.service';
import { PageEvent } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent implements OnInit {
    rapports: any[] = [];
    totalElement: number = 0;
    pageSize: number = 10;
    currentPage: number = 0;
    availablePeriods = [{code: 'CE_JOUR', name:'AUJOURDHUI'}, {code: 'CETTE_SEMAINE', name:'CETTE SEMAINE'},{code: 'CE_MOIS', name:'CE MOIS'},{code: 'HIER', name:'HIER'},{code: 'SEMAINE_PRECEDENTE', name:'SEMAINE PRECEDENTE'}, {code: 'MOIS_PRECEDENT', name:'MOIS PRECEDENT'}, {code: 'TROIS_DERNIER_MOIS', name:'TROIS DERNIER MOIS'},{code: 'SIX_DERNIER_MOIS', name:'SIX DERNIER MOIS'}, {code: 'CETTE_ANNEE', name:'CETTE ANNEE'}, {code: 'ANNEE_PRECEDENTE', name:'ANNEE PRECEDENTE'}];
    selectedPeriod: string = 'HIER';
    dateFrom: string = '';
    dateTo: string = '';
    totalAmount?: number ;
    releasedTotalAmount?: number;
    releasedTotalAmountt?: number;
  
    constructor(private reportService: ReportService,  
      private spinner: NgxSpinnerService, 
      private tokenStorage : TokenStorageService,
      private alertService: AlertService
    ) {
      this.tokenStorage.checkConnectedUser();
    }
  
    ngOnInit(): void {
    this.onGetReport();
    }
  
    getReportByCollector(period: string): void {
      this.reportService.getReportByCollector(period).subscribe(
        (response) => {
          if (response.status === 'OK') {
            this.rapports = response.data; 
            this.releasedTotalAmountt = response.data.releasedTotalAmount
          } else {
            alert(response.message)
            this.alertService.showDefaultError(response.message);
          }
        },
        (error) => {
          console.log('Error', JSON.stringify(error));
          this.alertService.showDefaultError('Erreur lors du chargement des données !');
        }
      );
    }
    getTotalAmountByPeriod(period: string): void {
      this.reportService.getTotalAmountByPeriod(period).subscribe(
        (response) => {
          if (response.status === 'OK') {
            this.totalAmount = response.data.totalAmount; 
            this.dateFrom = response.data.dateFrom;
            this.dateTo = response.data.dateTo;
            this.releasedTotalAmount = response.data.releasedTotalAmount;
          } else {
            this.alertService.showDefaultError( response.message);
          }
        },
        (error) => {
          console.log('Error', JSON.stringify(error));
          this.alertService.showDefaultError('Erreur lors du chargement du montant total !');
        }
      );
    }
    onGetReport(): void {
      this.getReportByCollector(this.selectedPeriod);
      this.getTotalAmountByPeriod(this.selectedPeriod); 
    }
    onPeriodChange(newPeriod: string): void {
      this.selectedPeriod = newPeriod;
      this.getReportByCollector(this.selectedPeriod);
    }
    refresh(): void {
      this.spinner.show();
      this.getReportByCollector(this.selectedPeriod);
      this.spinner.hide();
    }
  
    onPageChange(event: PageEvent): void {
      this.currentPage = event.pageIndex;
      this.pageSize = event.pageSize;
      this.getReportByCollector(this.selectedPeriod);
    }
  }