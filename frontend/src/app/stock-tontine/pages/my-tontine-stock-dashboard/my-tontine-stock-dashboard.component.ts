import { Component, OnInit } from '@angular/core';
import { TontineStockService } from '../../services/tontine-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { TontineStock } from '../../models/tontine-stock.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from 'src/app/client/service/client.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-my-tontine-stock-dashboard',
  templateUrl: './my-tontine-stock-dashboard.component.html',
  styleUrls: ['./my-tontine-stock-dashboard.component.scss']
})
export class MyTontineStockDashboardComponent implements OnInit {

  groupedStocks: any[] = [];

  currentUser: any;
  loading: boolean = false;
  agents: any[] = [];
  selectedAgent: string | null = null;
  isHistoric: boolean = false;

  // Pagination
  totalElements: number = 0;
  pageSize: number = 20;
  pageIndex: number = 0;

  constructor(
    private tontineStockService: TontineStockService,
    private authService: AuthService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
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
    this.tontineStockService.getAll(this.selectedAgent, this.pageIndex, this.pageSize, this.isHistoric).subscribe({
      next: (data) => {
        this.groupStocksByYear(data.content);
        this.totalElements = data.totalElements;
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Erreur chargement stock', err);
        this.spinner.hide();
      }
    });
  }

  groupStocksByYear(stocks: TontineStock[]) {
    const groups = new Map<string, any>();

    stocks.forEach(stock => {
      const key = `${stock.commercial}-${stock.year}`;
      if (!groups.has(key)) {
        groups.set(key, {
          collector: stock.commercial,
          year: stock.year,
          items: []
        });
      }
      groups.get(key).items.push(stock);
    });

    this.groupedStocks = Array.from(groups.values());
  }

  getTotalStockValue(group: any): number {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc: number, item: TontineStock) => acc + (item.availableQuantity * item.weightedAverageUnitPrice), 0);
  }

  getTotalSoldValue(group: any): number {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc: number, item: TontineStock) => acc + (item.distributedQuantity * item.weightedAverageUnitPrice), 0);
  }

  getTotalDueValue(group: any): number {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc: number, item: TontineStock) => acc + ((item.totalQuantity - item.quantityReturned) * item.weightedAverageUnitPrice), 0);
  }
}
