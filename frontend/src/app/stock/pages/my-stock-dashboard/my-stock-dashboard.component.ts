import { Component, OnInit } from '@angular/core';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { CommercialMonthlyStock } from '../../models/commercial-stock.model';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-my-stock-dashboard',
  templateUrl: './my-stock-dashboard.component.html',
  styleUrls: ['./my-stock-dashboard.component.scss']
})
export class MyStockDashboardComponent implements OnInit {

  stock: CommercialMonthlyStock | null = null;
  currentUser: any;
  loading: boolean = false;

  constructor(
    private commercialStockService: CommercialStockService,
    private authService: AuthService,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadCurrentStock();
  }

  loadCurrentStock() {
    this.spinner.show();
    this.commercialStockService.getCurrentStock(this.currentUser.username).subscribe({
      next: (data) => {
        this.stock = data;
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Erreur chargement stock', err);
        this.spinner.hide();
      }
    });
  }

  get totalStockValue(): number {
    if (!this.stock || !this.stock.items) return 0;
    return this.stock.items.reduce((acc, item) => acc + (item.quantityRemaining * item.weightedAverageUnitPrice), 0);
  }
}
