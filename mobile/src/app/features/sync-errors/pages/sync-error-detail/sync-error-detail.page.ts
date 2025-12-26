import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SyncError } from '../../../../models/sync.model';
import { SyncErrorService } from '../../../../core/services/sync-error.service';

@Component({
  selector: 'app-sync-error-detail',
  templateUrl: './sync-error-detail.page.html',
  styleUrls: ['./sync-error-detail.page.scss'],
  standalone: false
})
export class SyncErrorDetailPage implements OnInit {

  syncError$!: Observable<SyncError | null>;

  constructor(
    private route: ActivatedRoute,
    private syncErrorService: SyncErrorService
  ) { }

  ngOnInit() {
    this.syncError$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          return from(this.syncErrorService.getSyncErrorById(id));
        }
        return from([null]);
      })
    );
  }
}
