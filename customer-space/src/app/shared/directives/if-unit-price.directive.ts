import { Directive, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UnitPriceVisibilityService } from '../services/unit-price-visibility.service';

@Directive({
  selector: '[appIfUnitPrice]',
  standalone: true
})
export class IfUnitPriceDirective implements OnDestroy {
  private readonly sub: Subscription;
  private visible = false;

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    visibility: UnitPriceVisibilityService
  ) {
    this.sub = visibility.showUnitPrice$.subscribe(show => this.render(show));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private render(show: boolean): void {
    if (show === this.visible) {
      return;
    }
    this.visible = show;
    this.viewContainer.clear();
    if (show) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
