import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CartService } from '../../shared/services/cart.service';
import { CustomerArticle } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';

/** Page Catalogue — S-09. */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent],
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
})
export class CatalogPage implements OnInit, OnDestroy {
  articles: CustomerArticle[] = [];
  isLoading = true;
  cartCount = 0;
  private sub?: Subscription;

  constructor(private api: CustomerApiService, private cart: CartService) {}

  ngOnInit(): void {
    this.api.getArticles().subscribe({
      next: (a) => { this.articles = a; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
    this.sub = this.cart.cart$.subscribe(() => { this.cartCount = this.cart.totalItems; });
    this.cartCount = this.cart.totalItems;
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onSearch(e: Event): void {
    const value = (e as CustomEvent).detail?.value ?? '';
    this.api.getArticles(value).subscribe((a) => { this.articles = a; });
  }

  add(article: CustomerArticle): void { this.cart.add(article); }

  qty(id: string): number { return this.cart.quantityFor(id); }
}
