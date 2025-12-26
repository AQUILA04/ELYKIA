import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CreditService } from '../service/credit.service';

@Component({
  selector: 'app-credit-view',
  templateUrl: './credit-view.component.html',
  styleUrls: ['./credit-view.component.scss']
})
export class CreditViewComponent implements OnInit {
  creditId: number = 0;
  clientType: string = '';
  selectedTabIndex: number = 0;
  
  // Variables pour la distribution
  distributions: any[] = [];
  currentDistributionPage = 0;
  distributionPageSize = 5;
  totalDistributionElements = 0;
  
  // Variables pour les échéances
  echeances: any[] = [];
  currentEcheancePage = 0;
  echeancePageSize = 5;
  totalEcheanceElements = 0;
  
  // Variables pour les articles
  credit: any = { articles: [] };
  
  creditDetails: any = {};
  
  constructor(
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private creditService: CreditService,
    private router: Router
  ) { 
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.route.params.subscribe(params => {
      this.creditId = +params['id'];
      this.clientType = params['client-type'] || '';
      this.loadCreditDetails();
      this.loadInitialTabContent();
      this.spinner.hide();
    });
  }

  // Méthode pour charger le contenu initial selon le client-type
  loadInitialTabContent(): void {
    if (this.clientType === 'PROMOTER') {
      this.selectedTabIndex = 0; // Distribution
      this.loadDistributionData();
    } else if (this.clientType === 'CLIENT') {
      this.selectedTabIndex = 0; // Échéance (premier onglet visible)
      this.loadEcheanceData();
    }
    // Articles sera toujours chargé avec les détails du crédit
  }

  // Méthode pour gérer le changement d'onglet
  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
    this.loadTabContent(this.selectedTabIndex);
  }

  // Méthode pour charger le contenu de l'onglet sélectionné
  loadTabContent(tabIndex: number): void {
    this.spinner.show();
    
    setTimeout(() => {
      if (this.clientType === 'PROMOTER') {
        switch(tabIndex) {
          case 0: // Distribution
            this.loadDistributionData();
            break;
          case 1: // Articles
            // Articles déjà chargés avec les détails
            break;
        }
      } else if (this.clientType === 'CLIENT') {
        switch(tabIndex) {
          case 0: // Échéance
            this.loadEcheanceData();
            break;
          case 1: // Articles
            // Articles déjà chargés avec les détails
            break;
        }
      }
      
      this.spinner.hide();
    }, 500);
  }

  // Méthode pour charger les détails du crédit
  loadCreditDetails(): void {
    this.creditService.getCreditById(this.creditId).subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.credit = data.data;
          this.creditDetails = data.data;
        } else {
          alert(data.message);
        }
      },
      error => {
        console.error('Erreur lors du chargement des détails du crédit:', error?.message);
      }
    );
  }

  // Méthode pour charger les données de distribution
  loadDistributionData(): void {
    // Implémentation selon votre API de distribution
    this.creditService.getDistributionsByCredit(this.creditId, this.currentDistributionPage, this.distributionPageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.distributions = data.data.content; 
          this.totalDistributionElements = data.data.page.totalElements;
        } else {
          alert(data.message);
        }
      },
      error => {
        console.error('Erreur lors du chargement des distributions:', error);
      }
    );
  }

  // Méthode pour charger les données d'échéance
  loadEcheanceData(): void {
    // Implémentation selon votre API d'échéance
    this.creditService.getEcheancesByCredit(this.creditId, this.currentEcheancePage, this.echeancePageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.echeances = data.data.content; 
          this.totalEcheanceElements = data.data.page.totalElements;
        } else {
          alert(data.message);
        }
      },
      error => {
        console.error('Erreur lors du chargement des échéances:', error);
      }
    );
  }

  // Méthodes de pagination pour distribution
  onDistributionPageChange(event: PageEvent): void {
    this.currentDistributionPage = event.pageIndex;
    this.distributionPageSize = event.pageSize;
    this.loadDistributionData();
  }

  // Méthodes de pagination pour échéance
  onEcheancePageChange(event: PageEvent): void {
    this.currentEcheancePage = event.pageIndex;
    this.echeancePageSize = event.pageSize;
    this.loadEcheanceData();
  }

  // Méthodes de rafraîchissement
  refreshDistribution(): void {
    this.loadDistributionData();
  }

  refreshEcheance(): void {
    this.loadEcheanceData();
  }


  // Méthode pour voir les détails d'un crédit
  viewCreditDetails(creditId: number): void {
    this.router.navigate(['/credit-details', creditId]);
  }
}
