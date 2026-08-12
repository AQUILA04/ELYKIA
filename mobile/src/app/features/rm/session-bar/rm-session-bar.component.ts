import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { RmSessionStatusService } from './rm-session-status.service';

@Component({
  selector: 'app-rm-session-bar',
  templateUrl: './rm-session-bar.component.html',
  styleUrls: ['./rm-session-bar.component.scss'],
  standalone: false,
})
export class RmSessionBarComponent implements OnInit, OnDestroy {
  username = '—';
  isOnline = false;
  private sub?: Subscription;

  constructor(private readonly session: RmSessionStatusService) {}

  ngOnInit(): void {
    this.session.acquire();
    const snap = this.session.getSnapshot();
    this.username = snap.username;
    this.isOnline = snap.isOnline;
    this.sub = this.session.snapshot$.subscribe(s => {
      this.username = s.username;
      this.isOnline = s.isOnline;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.session.release();
  }
}
