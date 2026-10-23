import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-stock-tontine-redirect',
  template: ''
})
export class StockTontineRedirectComponent implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const path = this.router.url.split('?')[0];
    let target = '/stock/my-stock';
    if (path.includes('/request/create')) {
      target = '/stock/request/create';
    } else if (path.includes('/request')) {
      target = '/stock/request';
    } else if (path.includes('/return/create')) {
      target = '/stock/return/create';
    } else if (path.includes('/return')) {
      target = '/stock/return';
    } else if (path.includes('/my-stock')) {
      target = '/stock/my-stock';
    }

    this.router.navigate([target], {
      queryParams: {
        ...this.route.snapshot.queryParams,
        channel: 'tontine'
      },
      replaceUrl: true
    });
  }
}
