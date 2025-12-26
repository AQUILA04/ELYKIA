import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ClientService } from 'src/app/client/service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CreditService } from 'src/app/credit/service/credit.service';
import { CommercialService } from '../service/commercial.service';

@Component({
  selector: 'app-commercial-view',
  templateUrl: './commercial-view.component.html',
  styleUrls: ['./commercial-view.component.scss']
})
export class CommercialViewComponent implements OnInit {
  searchTerm: string = '';
  commercialId: number = 0;
  username: string = '';
  selectedTabIndex: number = 0;
  
  // Variables pour les clients
  clients: any[] = [];
  currentClientPage = 0;
  clientPageSize = 5;
  totalClientElements = 0;
  
  // Variables pour les ventes
  credits: any[] = [];
  currentCreditPage = 0;
  creditPageSize = 5;
  totalCreditElements = 0;

  // Variables pour les historiques
  historiques: any[] = [];
  currentHistoriquePage = 0;
  historiquePageSize = 5;
  totalHistoriqueElements = 0;
  
  // Variables pour les sorties
  sorties: any[] = [];
  currentSortiePage = 0;
  sortiePageSize = 5;
  totalSortieElements = 0;
  
  // Variables pour l'historique des sorties
  sortiesHistorique: any[] = [];
  currentSortieHistoriquePage = 0;
  sortieHistoriquePageSize = 5;
  totalSortieHistoriqueElements = 0;

  commercialDetails: any = {};
  
  constructor(
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private clientService: ClientService,
    private creditService: CreditService,
    private router: Router, 
    private commercialService: CommercialService
  ) { 
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.route.params.subscribe(params => {
      this.commercialId = +params['id'];
      this.username = params['username'] || '';
      this.loadCommercialDetails();
      this.loadVentesData();
      this.spinner.hide();
    });
  }

  // Méthode pour gérer le changement d'onglet
  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
    this.loadTabContent(this.selectedTabIndex);
  }

  // Méthode pour charger le contenu de l'onglet sélectionné
  // Mise à jour de la méthode loadTabContent
  loadTabContent(tabIndex: number): void {
    this.spinner.show();
    
    setTimeout(() => {
      switch(tabIndex) {
        case 0: // Ventes
          this.loadVentesData();
          break;
        case 1: // Historiques
          this.loadHistoriquesData();
          break;
        case 2: // Clients
          this.loadClientsData();
          break;
        case 3: // Sorties en attentes
          this.loadSortiesData();
          break;
        case 4: // Historiques Sorties
          this.loadSortiesHistoriqueData();
          break;
      }
      
      this.spinner.hide();
    }, 500);
  }

  loadCommercialDetails(): void {
    this.spinner.show();
    this.commercialService.getCommercialDetailsById(this.commercialId).subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
            this.commercialDetails = response.data;
            this.spinner.hide();
        }else {
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

  // Méthode pour charger les ventes du commercial
  loadVentesData(): void {
    this.spinner.show();
    this.creditService.getCreditsByCommercial(this.username, this.currentCreditPage, this.creditPageSize, 'id,desc').subscribe(
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
        console.error('Erreur lors du chargement des ventes', error);
      }
    );
  }

  loadDelayedCredit(): void {
    this.spinner.show();
    this.creditService.getDelayedCreditByCommercial(this.username, this.currentCreditPage, this.creditPageSize, 'id,desc').subscribe(
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
        console.error('Erreur lors du chargement des ventes en retard', error);
      }
    );
  }

  loadEndingdCredit(): void {
    this.spinner.show();
    this.creditService.getEndingCreditByCommercial(this.username, this.currentCreditPage, this.creditPageSize, 'id,desc').subscribe(
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
        console.error('Erreur lors du chargement des ventes en retard', error);
      }
    );
  }

  // Méthode pour rafraîchir la liste des ventes
  refreshVentes(): void {
    this.loadVentesData();
  }

  // Méthode pour gérer le changement de page des ventes
  onCreditPageChange(event: PageEvent): void {
    this.currentCreditPage = event.pageIndex;
    this.creditPageSize = event.pageSize;
    this.loadVentesData();
  }

  // Méthode pour voir les détails d'une vente
  viewCreditDetails(creditId: number): void {
    this.router.navigate(['/credit-details', creditId]);
  }

  // Méthode pour charger les clients du commercial
  loadClientsData(): void {
    this.spinner.show();
    // Ici, vous devrez adapter l'appel au service pour récupérer les clients associés au commercial
    this.clientService.getClientByCommercial(this.username, this.currentClientPage, this.clientPageSize, 'id,desc', this.searchTerm).subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.clients = data.data.content; 
          this.totalClientElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des clients', error);
      }
    );
  }

  // Méthode pour rafraîchir la liste des clients
  refreshClients(): void {
    this.loadClientsData();
  }

  // Méthode pour gérer le changement de page des clients
  onClientPageChange(event: PageEvent): void {
    this.currentClientPage = event.pageIndex;
    this.clientPageSize = event.pageSize;
    this.loadClientsData();
  }

  // Méthode pour voir les détails d'un client
  viewClientDetails(clientId: number): void {
    this.router.navigate(['/client-details', clientId]);
  }

  loadHistoriquesData(): void {
    this.spinner.show();
    this.creditService.getCreditHistoryByCommercial(this.username, this.currentHistoriquePage, this.historiquePageSize, 'id,desc').subscribe(
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



  // Méthode pour charger les sorties du commercial
  loadSortiesData(): void {
    this.spinner.show();
    this.creditService.getSortiesByCommercial(this.username, this.currentSortiePage, this.sortiePageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.sorties = data.data.content; 
          this.totalSortieElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement des sorties', error);
      }
    );
  }

  // Méthode pour rafraîchir la liste des sorties
  refreshSorties(): void {
    this.loadSortiesData();
  }

  // Méthode pour gérer le changement de page des sorties
  onSortiePageChange(event: PageEvent): void {
    this.currentSortiePage = event.pageIndex;
    this.sortiePageSize = event.pageSize;
    this.loadSortiesData();
  }

  // Méthode pour voir les détails d'une sortie
  viewSortieDetails(sortieId: number): void {
    this.router.navigate(['/sortie-details', sortieId]);
  }

  // Méthode pour charger l'historique des sorties du commercial
  loadSortiesHistoriqueData(): void {
    this.spinner.show();
    this.creditService.getSortiesHistoryByCommercial(this.username, this.currentSortieHistoriquePage, this.sortieHistoriquePageSize, 'id,desc').subscribe(
      data => {
        if(data.statusCode === 200){ 
          this.sortiesHistorique = data.data.content; 
          this.totalSortieHistoriqueElements = data.data.page.totalElements;
          this.spinner.hide();
        } else {
          this.spinner.hide();
          alert(data.message);
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors du chargement de l\'historique des sorties', error);
      }
    );
  }

  // Méthode pour rafraîchir l'historique des sorties
  refreshSortiesHistorique(): void {
    this.loadSortiesHistoriqueData();
  }

  // Méthode pour gérer le changement de page de l'historique des sorties
  onSortieHistoriquePageChange(event: PageEvent): void {
    this.currentSortieHistoriquePage = event.pageIndex;
    this.sortieHistoriquePageSize = event.pageSize;
    this.loadSortiesHistoriqueData();
  }


  search(): void {
    this.spinner.show();
    
    setTimeout(() => {
      switch(this.selectedTabIndex) {
        case 0: // Ventes
          this.loadVentesData();
          break;
        case 1: // Historiques
          this.loadHistoriquesData();
          break;
        case 2: // Clients
          this.loadClientsData();
          break;
        case 3: // Sorties en attentes
          this.loadSortiesData();
          break;
        case 4: // Historiques Sorties
          this.loadSortiesHistoriqueData();
          break;
      }
      
      this.spinner.hide();
    }, 500);
  }}
