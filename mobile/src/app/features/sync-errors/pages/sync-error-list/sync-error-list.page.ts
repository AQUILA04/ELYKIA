import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';
import { SyncError } from '../../../../models/sync.model';
import { SyncErrorService } from '../../../../core/services/sync-error.service';

@Component({
  selector: 'app-sync-error-list',
  templateUrl: './sync-error-list.page.html',
  styleUrls: ['./sync-error-list.page.scss'],
  standalone: false
})
export class SyncErrorListPage {

  syncErrors$!: Observable<SyncError[]>;

  constructor(
    private syncErrorService: SyncErrorService,
    private router: Router
  ) { }

  ionViewWillEnter() {
    this.loadErrors();
  }

  loadErrors(event?: any) {
    this.syncErrors$ = from(this.syncErrorService.getSyncErrors());
    this.syncErrors$.subscribe(() => {
      if (event) {
        event.target.complete();
      }
    });
  }

  goToDetails(id: string) {
    this.router.navigate(['/sync-errors', id]);
  }

  handleRefresh(event: any) {
    this.loadErrors(event);
  }

  isValidDate(dateValue?: string | Date): boolean {
    if (!dateValue) return false;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return !isNaN(date.getTime());
  }
}
