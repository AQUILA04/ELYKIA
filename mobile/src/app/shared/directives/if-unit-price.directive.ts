import { Directive, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UnitPriceVisibilityService } from '../../core/services/unit-price-visibility.service';

@Directive({
  selector: '[appIfUnitPrice]',
  standalone: true
})
export class IfUnitPriceDirective implements OnInit, OnDestroy {
  private sub?: Subscription;
  private shown = false;

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private visibility: UnitPriceVisibilityService
  ) {}

  ngOnInit(): void {
    this.sub = this.visibility.showUnitPrice$.subscribe(show => this.render(show));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
