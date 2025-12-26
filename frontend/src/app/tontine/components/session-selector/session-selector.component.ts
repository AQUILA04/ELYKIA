import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TontineSessionService } from '../../services/tontine-session.service';
import { TontineSession } from '../../types/tontine.types';

@Component({
  selector: 'app-session-selector',
  templateUrl: './session-selector.component.html',
  styleUrls: ['./session-selector.component.scss']
})
export class SessionSelectorComponent implements OnInit {
  @Output() sessionChange = new EventEmitter<TontineSession>();

  sessions: TontineSession[] = [];
  selectedSession: TontineSession | null = null;
  loading = false;

  constructor(private sessionService: TontineSessionService) { }

  ngOnInit(): void {
    this.loadSessions();
  }

  private loadSessions(): void {
    this.loading = true;
    this.sessionService.getAllSessions().subscribe({
      next: (response) => {
        if (response.data) {
          this.sessions = response.data;
          this.selectedSession = this.sessions.find(s => s.status === 'ACTIVE') || this.sessions[0] || null;
          if (this.selectedSession) {
            this.sessionService.setCurrentSession(this.selectedSession);
            this.sessionChange.emit(this.selectedSession);
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSessionChange(session: TontineSession): void {
    this.selectedSession = session;
    this.sessionService.setCurrentSession(session);
    this.sessionChange.emit(session);
  }

  isCurrentSession(): boolean {
    return this.selectedSession?.status === 'ACTIVE';
  }
}
