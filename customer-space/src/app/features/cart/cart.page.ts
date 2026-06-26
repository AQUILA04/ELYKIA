import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CartService, CartLine } from '../../shared/services/cart.service';
import { CustomerApiService } from '../../shared/services/customer-api.service';

/** Page Panier — S-10. */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
})
export class CartPage implements OnInit, OnDestroy {
  lines: CartLine[] = [];
  isSubmitting = false;
  error = '';
  private sub?: Subscription;

  constructor(
    private cart: CartService,
    private api: CustomerApiService,
    private router: Router,
  ) {}

  get totalAmount(): number { return this.cart.totalAmount; }

  ngOnInit(): void {
    this.sub = this.cart.cart$.subscribe((lines) => { this.lines = lines; });
    this.lines = this.cart.lines;
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  increment(line: CartLine): void {
    this.cart.setQuantity(line.article.id, line.quantity + 1, line.article);
  }

  decrement(line: CartLine): void {
    this.cart.setQuantity(line.article.id, line.quantity - 1, line.article);
  }

  lineTotal(line: CartLine): number {
    return line.article.creditSalePrice * line.quantity;
  }

  async submitOrder(): Promise<void> {
    if (this.lines.length === 0) return;
    this.isSubmitting = true;
    this.error = '';
    try {
      const res = await firstValueFrom(this.api.submitOrder({ items: this.cart.toOrderItems() }));
      this.cart.clear();
      await this.router.navigate(['/order-confirmation'], {
        queryParams: { reference: res.reference, amount: res.totalAmount },
      });
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      this.error = err?.error?.message ?? 'Impossible de soumettre la commande.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
