import { Component, OnInit } from '@angular/core';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { CommercialMonthlyStock } from '../../models/commercial-stock.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from 'src/app/client/service/client.service';
import { PageEvent } from '@angular/material/paginator';
import {UserService} from "../../../user/service/user.service";
import {UserProfile} from "../../../shared/models/user-profile.enum";

@Component({
  selector: 'app-my-stock-dashboard',
  templateUrl: './my-stock-dashboard.component.html',
  styleUrls: ['./my-stock-dashboard.component.scss']
})
export class MyStockDashboardComponent implements OnInit {

  stocks: CommercialMonthlyStock[] = [];
  currentUser: any;
  loading: boolean = false;
  agents: any[] = [];
  selectedAgent: string | null = null;
  isHistoric: boolean = false;

  // Pagination
  totalElements: number = 0;
  pageSize: number = 20;
  pageIndex: number = 0;
  isManager = false; // Changed declaration
  isStoreKeeper = false; // Changed declaration
  isPromoter = false; // Changed declaration
  isSecretary = false;

  constructor(
    private commercialStockService: CommercialStockService,
    private authService: AuthService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE) || this.userService.hasProfile(UserProfile.ADMIN) || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
    this.loadAgents();
    this.loadCurrentStock();
  }

  loadAgents(): void {
    this.clientService.getAgents().subscribe(
      data => {
        this.agents = data;
      },
      error => {
        console.error('Erreur lors du chargement des agents', error);
      }
    );
  }

  searchAgent = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onAgentChange(agent: any) {
    this.selectedAgent = agent ? agent.username : null;
    this.pageIndex = 0; // Reset pagination
    this.loadCurrentStock();
  }

  toggleHistoric() {
    this.isHistoric = !this.isHistoric;
    this.pageIndex = 0; // Reset pagination
    this.loadCurrentStock();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCurrentStock();
  }

  loadCurrentStock() {
    this.spinner.show();
    this.commercialStockService.getAll(this.selectedAgent, this.pageIndex, this.pageSize, this.isHistoric).subscribe({
      next: (data) => {
        this.stocks = data.content;
        this.totalElements = data.page.totalElements;
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Erreur chargement stock', err);
        this.spinner.hide();
      }
    });
  }

  getTotalStockValue(stock: CommercialMonthlyStock): number {
    if (!stock || !stock.items) return 0;
    return stock.items.reduce((acc, item) => acc + (item.quantityRemaining * item.weightedAverageUnitPrice), 0);
  }

  getTotalSoldValue(stock: CommercialMonthlyStock): number {
    if (!stock || !stock.items) return 0;
    return stock.items.reduce((acc, item) => acc + (item.quantitySold * item.weightedAverageUnitPrice), 0);
  }

  getTotalDueValue(stock: CommercialMonthlyStock): number {
    if (!stock || !stock.items) return 0;
    return stock.items.reduce((acc, item) => acc + ((item.quantityTaken - item.quantityReturned) * item.weightedAverageUnitPrice), 0);
  }

  getMonthName(monthNumber: number): string {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('fr-FR', { month: 'long' });
  }
}
