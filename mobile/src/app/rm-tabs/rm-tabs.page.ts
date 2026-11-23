import { Component } from '@angular/core';
import { RmPendingQueuesService } from '../core/services/rm/rm-pending-queues.service';

@Component({
  selector: 'app-rm-tabs',
  templateUrl: 'rm-tabs.page.html',
  styleUrls: ['rm-tabs.page.scss'],
  standalone: false,
})
export class RmTabsPage {
  /** Saisies terrain enregistrées sur le téléphone et pas encore envoyées. */
  readonly pendingCount$ = this.pendingQueues.pendingCount$;

  constructor(private readonly pendingQueues: RmPendingQueuesService) {}
}
