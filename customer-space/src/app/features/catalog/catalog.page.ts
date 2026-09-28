import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CartService } from '../../shared/services/cart.service';
import { CustomerArticle, CustomerArticleType } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { articleDisplayName } from '../../shared/utils/article-display';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Page Catalogue — Type C. */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent, ElykPageHeaderComponent],
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
})
export class CatalogPage implements OnInit, OnDestroy {
  articles: CustomerArticle[] = [];
  topTypes: CustomerArticleType[] = [];
  selectedCategory = '';
  searchTerm = '';
  isLoading = true;
  cartCount = 0;
  private sub?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(private api: CustomerApiService, private cart: CartService) {}

  ngOnInit(): void {
    this.loadArticles();
    this.api.getTopArticleTypes().subscribe({
      next: (types) => { this.topTypes = types; },
    });
    this.sub = this.cart.cart$.subscribe(() => { this.cartCount = this.cart.totalItems; });
    this.cartCount = this.cart.totalItems;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  onSearchInput(e: Event): void {
    const value = (e.target as HTMLInputElement)?.value ?? '';
    this.searchTerm = value;
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.loadArticles(), 400);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.loadArticles();
  }

  add(article: CustomerArticle): void { this.cart.add(article); }

  qty(id: string): number { return this.cart.quantityFor(id); }

  label(article: CustomerArticle): string {
    return articleDisplayName(article);
  }

  private loadArticles(): void {
    this.isLoading = true;
    this.api.getArticles(this.searchTerm || undefined, this.selectedCategory || undefined).subscribe({
      next: (a) => {
        this.articles = a;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }
}
