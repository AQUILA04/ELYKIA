import { Component, Input } from '@angular/core';
import { DailyOperationLog } from 'src/app/report/models/daily-operation-log.model';
import { formatOperationMessage, getOperationIcon } from '../../utils/operation-message.util';

@Component({
  selector: 'app-recent-activity-panel',
  templateUrl: './recent-activity-panel.component.html',
  styleUrls: ['./recent-activity-panel.component.scss']
})
export class RecentActivityPanelComponent {
  @Input() operations: DailyOperationLog[] = [];
  @Input() loading = false;

  message(op: DailyOperationLog): string {
    return formatOperationMessage(op);
  }

  icon(op: DailyOperationLog): string {
    return getOperationIcon(op.type);
  }
}
