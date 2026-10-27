import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { TontineSessionService } from '../../services/tontine-session.service';
import { TontineSession } from '../../types/tontine.types';

@Component({
  selector: 'app-session-selector',
  templateUrl: './session-selector.component.html',
  styleUrls: ['./session-selector.component.scss']
})
export class SessionSelectorComponent implements OnInit, OnDestroy {
  @Output() sessionChange = new EventEmitter<TontineSession>();

  sessions: TontineSession[] = [];
  selectedSession: TontineSession | null = null;
  loading = false;
  private refreshSub?: Subscription;

  constructor(private sessionService: TontineSessionService) { }

  ngOnInit(): void {
    this.loadSessions();
    this.refreshSub = this.sessionService.refresh$.subscribe(() => this.loadSessions(this.selectedSession?.id));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadSessions(preferredId?: number): void {
    this.loading = true;
    this.sessionService.getAllSessions().subscribe({
      next: (response) => {
        if (response.data) {
          this.sessions = response.data;
          const preferred = preferredId != null
            ? this.sessions.find(session => session.id === preferredId)
            : undefined;
          this.selectedSession = preferred || this.defaultSession() || null;
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

  private defaultSession(): TontineSession | undefined {
    const year = new Date().getFullYear();
    return this.sessions.find(session => session.kind === 'ANNUAL' && session.year === year && session.status === 'ACTIVE')
      || this.sessions.find(session => session.kind === 'ANNUAL' && session.year === year)
      || this.sessions.find(session => session.status === 'ACTIVE')
      || this.sessions[0];
  }

  onSessionChange(session: TontineSession): void {
    this.selectedSession = session;
    this.sessionService.setCurrentSession(session);
    this.sessionChange.emit(session);
  }

  sessionLabel(session: TontineSession): string {
    const name = session.name || `Session ${session.year}`;
    return `${name} · ${this.shortDate(session.startDate)} – ${this.shortDate(session.endDate)}`;
  }

  statusLabel(): string {
    switch (this.selectedSession?.status) {
      case 'ACTIVE':
        return 'Session ouverte';
      case 'CLOSED':
        return 'Livraisons en cours';
      case 'ENDED':
        return 'Session terminée';
      default:
        return 'Session';
    }
  }

  isOpenSession(): boolean {
    return this.selectedSession?.status === 'ACTIVE';
  }

  private shortDate(value?: string): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.substring(0, 10).split('-');
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  }
}
