import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerArticle } from '../../shared/models/customer.model';
/** Page Catalogue — S-09. @author Francis AHONSU */
@Component({ selector: 'app-catalog', standalone: true, imports: [CommonModule, IonicModule, RouterModule], templateUrl: './catalog.page.html', styleUrls: ['./catalog.page.scss'] })
export class CatalogPage implements OnInit {
  articles: CustomerArticle[] = [];
  cart: Map<string, number> = new Map();
  isLoading = true;
  constructor(private api: CustomerApiService) {}
  ngOnInit(): void { this.api.getArticles().subscribe({ next: a => { this.articles = a; this.isLoading = false; }, error: () => this.isLoading = false }); }
  onSearch(e: any): void { this.api.getArticles(e.target.value).subscribe(a => this.articles = a); }
  add(id: string): void { this.cart.set(id, (this.cart.get(id) ?? 0) + 1); }
  qty(id: string): number { return this.cart.get(id) ?? 0; }
  get cartCount(): number { return Array.from(this.cart.values()).reduce((a, b) => a + b, 0); }
}
