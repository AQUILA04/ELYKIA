import { Directive, OnDestroy, OnInit } from '@angular/core';

@Directive()
export abstract class CommercialPageBase implements OnInit, OnDestroy {
  currentDate = new Date();
  lastUpdate = new Date();
  private clock?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.clock = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
    this.start();
  }

  ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
  }

  protected markUpdated(): void {
    this.lastUpdate = new Date();
  }

  protected abstract start(): void;
}
