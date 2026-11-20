import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UnitPriceVisibilityService } from '../service/unit-price-visibility.service';

/**
 * Affiche l'élément seulement lorsque le profil courant peut voir le prix unitaire.
 * `*appIfUnitPrice` suit la règle générale. `*appIfUnitPrice="credit.type"` suit la règle
 * du type de vente : une vente CASH suit le paramètre des ventes comptant.
 */
@Directive({
  selector: '[appIfUnitPrice]'
})
export class IfUnitPriceDirective implements OnInit, OnDestroy {
  private sub?: Subscription;
  private shown = false;
  private saleType?: string | null;
  private initialized = false;

  @Input()
  set appIfUnitPrice(saleType: string | null | undefined | '') {
    const next = saleType || null;
    if (next === this.saleType) {
      return;
    }
    this.saleType = next;
    if (this.initialized) {
      this.subscribe();
    }
  }

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private visibility: UnitPriceVisibilityService
  ) {}

  ngOnInit(): void {
    this.initialized = true;
    this.subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private subscribe(): void {
    this.sub?.unsubscribe();
    this.sub = this.visibility.showUnitPriceFor$(this.saleType).subscribe(show => this.render(show));
  }

  private render(show: boolean): void {
    if (show && !this.shown) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.shown = true;
    } else if (!show && this.shown) {
      this.viewContainer.clear();
      this.shown = false;
    }
  }
}
