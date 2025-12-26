import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ClientService } from 'src/app/client/service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CreditService } from 'src/app/credit/service/credit.service';

@Component({
  selector: 'app-client-view',
  templateUrl: './client-view.component.html',
  styleUrls: ['./client-view.component.scss']
})
export class ClientViewComponent implements OnInit {
  clientId: number = 0;
  selectedTabIndex: number = 0;
  
  // Variables pour les achats
  credits: any[] = [];
  currentCreditPage = 0;
  creditPageSize = 5;
  totalCreditElements = 0;

  // Variables pour les historiques
  historiques: any[] = [];
  currentHistoriquePage = 0;
  historiquePageSize = 5;
  totalHistoriqueElements = 0;

  clientDetails: any = {};

  
  // Variables pour les crédits en attente
  pendingCredits: any[] = [];
  currentPendingPage = 0;
  pendingPageSize = 5;
  totalPendingElements = 0;
  
  constructor(
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private clientService: ClientService,
    private creditService: CreditService,
    private router: Router
  ) { 
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.route.params.subscribe(params => {
      this.clientId = +params['id'];
      this.loadClientDetails();
      this.loadAchatsData();
      this.spinner.hide();
    });
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
      switch(tabIndex) {
        case 0: // Achats
          this.loadAchatsData();
          break;
        case 1: // Historiques
          this.loadHistoriquesData();
          break;
        case 2: // En Attente
          this.loadPendingData();
          break;
      }
      
      this.spinner.hide();
    }, 500);
  }

  // Méthode pour charger les crédits en attente
  loadPendingData(): void {
    this.spinner.show();
    this.creditService.getPendingCreditsByClient(this.clientId, this.currentPendingPage, this.pendingPageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.pendingCredits = data.data.content; 
          this.totalPendingElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des crédits en attente', error);
      }
    );
  }

  // Méthode pour rafraîchir la liste des crédits en attente
  refreshPending(): void {
    this.loadPendingData();
  }

  // Méthode pour gérer le changement de page des crédits en attente
  onPendingPageChange(event: PageEvent): void {
    this.currentPendingPage = event.pageIndex;
    this.pendingPageSize = event.pageSize;
    this.loadPendingData();
  }

  loadClientDetails(): void {
    this.spinner.show();
    this.creditService.getClientDetails(this.clientId).subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
            this.clientDetails = response.data;
            this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(response.message);
        }
      }, 
      (error: any) => {
        console.log(error.message);
        this.spinner.hide();
        alert(error);
      });
  }

  // Méthode pour charger les achats du client
  loadAchatsData(): void {
    this.spinner.show();
    this.creditService.getCreditsByClient(this.clientId, this.currentCreditPage, this.creditPageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.credits = data.data.content; 
          this.totalCreditElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des achats', error);
      }
    );
  }

  // Méthode pour rafraîchir la liste des achats
  refreshAchats(): void {
    this.loadAchatsData();
  }

  // Méthode pour gérer le changement de page des achats
  onCreditPageChange(event: PageEvent): void {
    this.currentCreditPage = event.pageIndex;
    this.creditPageSize = event.pageSize;
    this.loadAchatsData();
  }

  // Méthode pour voir les détails d'un achat
  viewCreditDetails(creditId: number): void {
    this.router.navigate(['/credit-details', creditId]);
  }

  navigateToCreditView(creditId: number, clientType: string): void {
    this.router.navigate(['/credit-view', creditId, clientType]);
  }


  loadHistoriquesData(): void {
    this.spinner.show();
    this.creditService.getCreditHistoryByClient(this.clientId, this.currentHistoriquePage, this.historiquePageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.historiques = data.data.content; 
          this.totalHistoriqueElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement de l\'historique', error);
      }
    );
  }

  // Méthode pour rafraîchir l'historique
  refreshHistoriques(): void {
    this.loadHistoriquesData();
  }

  // Méthode pour gérer le changement de page de l'historique
  onHistoriquePageChange(event: PageEvent): void {
    this.currentHistoriquePage = event.pageIndex;
    this.historiquePageSize = event.pageSize;
    this.loadHistoriquesData();
  }
}
