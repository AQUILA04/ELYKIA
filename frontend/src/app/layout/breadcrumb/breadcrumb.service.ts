import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  route: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbItemsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  breadcrumbItems$ = this.breadcrumbItemsSubject.asObservable();

  setBreadcrumb(items: BreadcrumbItem[]) {
    this.breadcrumbItemsSubject.next(items);
  }
}
