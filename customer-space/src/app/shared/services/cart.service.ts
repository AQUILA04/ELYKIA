import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { CustomerArticle } from '../models/customer.model';

export interface CartLine {
  article: CustomerArticle;
  quantity: number;
}

const CART_KEY = 'elykia_customer_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly journal = inject(UserJournalService);
  private readonly cartSubject = new BehaviorSubject<CartLine[]>(this.load());

  readonly cart$ = this.cartSubject.asObservable();

  get lines(): CartLine[] {
    return this.cartSubject.getValue();
  }

  get totalItems(): number {
    return this.lines.reduce((sum, l) => sum + l.quantity, 0);
  }

  get totalAmount(): number {
    return this.lines.reduce((sum, l) => sum + l.article.creditSalePrice * l.quantity, 0);
  }

  quantityFor(articleId: string): number {
    return this.lines.find((l) => l.article.id === articleId)?.quantity ?? 0;
  }

  add(article: CustomerArticle, qty = 1): void {
    const lines = [...this.lines];
    const idx = lines.findIndex((l) => l.article.id === article.id);
    if (idx >= 0) {
      lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + qty };
    } else {
      lines.push({ article, quantity: qty });
    }
    this.persist(lines);
    this.journal.track('CART_ADD', 'BUSINESS', {
      articleId: article.id,
      quantity: qty,
    });
  }

  setQuantity(articleId: string, quantity: number, article?: CustomerArticle): void {
    let lines = [...this.lines];
    const idx = lines.findIndex((l) => l.article.id === articleId);
    const previousQty = idx >= 0 ? lines[idx].quantity : 0;
    if (quantity <= 0) {
      lines = lines.filter((l) => l.article.id !== articleId);
      if (previousQty > 0) {
        this.journal.track('CART_REMOVE', 'BUSINESS', { articleId });
      }
    } else if (idx >= 0) {
      lines[idx] = { ...lines[idx], quantity };
      if (quantity > previousQty) {
        this.journal.track('CART_ADD', 'BUSINESS', {
          articleId,
          quantity: quantity - previousQty,
        });
      } else if (quantity < previousQty) {
        this.journal.track('CART_REMOVE', 'BUSINESS', {
          articleId,
          quantity: previousQty - quantity,
        });
      }
    } else if (article) {
      lines.push({ article, quantity });
      this.journal.track('CART_ADD', 'BUSINESS', { articleId, quantity });
    }
    this.persist(lines);
  }

  clear(): void {
    this.persist([]);
  }

  toOrderItems(): { articleId: string; quantity: number }[] {
    return this.lines.map((l) => ({ articleId: l.article.id, quantity: l.quantity }));
  }

  private persist(lines: CartLine[]): void {
    sessionStorage.setItem(CART_KEY, JSON.stringify(lines));
    this.cartSubject.next(lines);
  }

  private load(): CartLine[] {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }
}
