import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { TontineService } from '../../services/tontine.service';
import { TontineAllocationMigrationStatus } from '../../types/tontine-allocation-migration.types';

@Component({
  selector: 'app-tontine-allocation-migration-banner',
  templateUrl: './tontine-allocation-migration-banner.component.html',
  styleUrls: ['./tontine-allocation-migration-banner.component.scss']
})
export class TontineAllocationMigrationBannerComponent implements OnInit, OnDestroy {
  @Input() pollIntervalMs = 5000;

  status: TontineAllocationMigrationStatus | null = null;
  private pollSub?: Subscription;

  constructor(private readonly tontineService: TontineService) {}

  ngOnInit(): void {
    this.pollSub = interval(this.pollIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.tontineService.getAllocationMigrationStatus())
      )
      .subscribe({
        next: (status) => {
          this.status = status;
          this.tontineService.setAllocationMigrationRunning(status.running);
        },
        error: () => {
          this.status = null;
          this.tontineService.setAllocationMigrationRunning(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.tontineService.setAllocationMigrationRunning(false);
  }

  get isRunning(): boolean {
    return this.status?.running === true;
  }

  get progressLabel(): string {
    if (!this.status) {
      return '';
    }
    return `${this.status.processedMembers}/${this.status.totalMembers}`;
  }

  get versionLabel(): string {
    if (!this.status?.fromVersion || !this.status?.toVersion) {
      return '';
    }
    return `${this.status.fromVersion} → ${this.status.toVersion}`;
  }
}
