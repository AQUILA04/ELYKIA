import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SyncError } from '../../../../models/sync.model';
import { SyncErrorService } from '../../../../core/services/sync-error.service';
import { syncEntityLabel } from '../../../../core/services/rm/rm-sync-failure';

@Component({
  selector: 'app-sync-error-detail',
  templateUrl: './sync-error-detail.page.html',
  styleUrls: ['./sync-error-detail.page.scss'],
  standalone: false
})
export class SyncErrorDetailPage implements OnInit {

  syncState$!: Observable<{ error: SyncError | null }>;

  constructor(
    private route: ActivatedRoute,
    private syncErrorService: SyncErrorService
  ) { }

  ngOnInit() {
    this.syncState$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          return from(Promise.resolve({ error: null as SyncError | null }));
        }
        return from(this.syncErrorService.getSyncErrorById(id).then(error => ({ error })));
      })
    );
  }

  entityLabel(entityType: string): string {
    return syncEntityLabel(entityType);
  }
}
