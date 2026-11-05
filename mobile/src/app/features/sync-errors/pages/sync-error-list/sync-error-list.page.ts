import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { from, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { SyncError } from '../../../../models/sync.model';
import { SyncErrorService } from '../../../../core/services/sync-error.service';
import { syncEntityLabel } from '../../../../core/services/rm/rm-sync-failure';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { hasRecoveryManagerProfil } from '../../../../core/utils/rm-user.util';

@Component({
  selector: 'app-sync-error-list',
  templateUrl: './sync-error-list.page.html',
  styleUrls: ['./sync-error-list.page.scss'],
  standalone: false
})
export class SyncErrorListPage {

  syncErrors$!: Observable<SyncError[]>;
  backHref = '/tabs/more';

  constructor(
    private syncErrorService: SyncErrorService,
    private router: Router,
    private store: Store
  ) { }

  ionViewWillEnter() {
    this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
      this.backHref = hasRecoveryManagerProfil(user) ? '/rm/more' : '/tabs/more';
    });
    this.loadErrors();
  }

  entityLabel(entityType: string): string {
    return syncEntityLabel(entityType);
  }

  loadErrors(event?: any) {
    this.syncErrors$ = from(this.syncErrorService.getSyncErrors());
    this.syncErrors$.subscribe((data) => {
      console.log('Raw sync errors:', data);
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
