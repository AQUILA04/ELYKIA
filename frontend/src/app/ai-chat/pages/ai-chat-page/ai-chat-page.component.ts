import { Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AiPermissions } from 'src/app/shared/constants/ai-permission.constant';
import { AiChatService } from '../../services/ai-chat.service';
import {
  AiChatResponse,
  ChatMessage,
  ConversationSummary,
} from '../../models/ai-chat.models';

@Component({
  selector: 'app-ai-chat-page',
  templateUrl: './ai-chat-page.component.html',
  styleUrls: ['./ai-chat-page.component.scss'],
})
export class AiChatPageComponent implements OnInit, OnDestroy {
  conversations: ConversationSummary[] = [];
  messages: ChatMessage[] = [];
  domains: string[] = [];
  activeConversationId: string | null = null;
  loadingSessions = false;
  loadingMessages = false;
  sending = false;
  showSql = false;
  providerLabel = '';
  activeTab: 'chat' | 'stats' = 'chat';
  readonly aiPermissions = AiPermissions;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadDomains();
    this.loadHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSessions(selectLatest = false): void {
    this.loadingSessions = true;
    this.aiChatService
      .listConversations()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingSessions = false))
      )
      .subscribe({
        next: (sessions) => {
          this.conversations = sessions;
          if (selectLatest && sessions.length > 0) {
            this.selectConversation(sessions[0].id);
          }
        },
        error: (err) => this.handleError('Impossible de charger les discussions', err),
      });
  }

  loadDomains(): void {
    this.aiChatService
      .getDomains()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (domains) => (this.domains = domains),
        error: () => (this.domains = []),
      });
  }

  loadHealth(): void {
    this.aiChatService
      .getHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (health) => {
          this.providerLabel = `${health.provider} · ${health.model}`;
          this.showSql = health.provider !== 'openai';
        },
        error: () => (this.providerLabel = ''),
      });
  }

  onNewConversation(): void {
    this.aiChatService
      .createConversation()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          this.conversations = [session, ...this.conversations];
          this.activeConversationId = session.id;
          this.messages = [];
        },
        error: (err) => this.handleError('Impossible de créer une discussion', err),
      });
  }

  selectConversation(id: string): void {
    if (this.activeConversationId === id && this.messages.length > 0) {
      return;
    }
    this.activeConversationId = id;
    this.loadingMessages = true;
    this.aiChatService
      .getConversation(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingMessages = false))
      )
      .subscribe({
        next: (detail) => {
          this.messages = detail.messages ?? [];
        },
        error: (err) => this.handleError('Impossible de charger la discussion', err),
      });
  }

  onDeleteConversation(id: string): void {
    this.alertService
      .showConfirmation('Supprimer la discussion', 'Cette action est irréversible.', 'Supprimer', 'Annuler')
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.aiChatService
          .deleteConversation(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.conversations = this.conversations.filter((c) => c.id !== id);
              if (this.activeConversationId === id) {
                this.activeConversationId = null;
                this.messages = [];
              }
            },
            error: (err) => this.handleError('Suppression impossible', err),
          });
      });
  }

  onSendMessage(text: string): void {
    if (!this.activeConversationId) {
      this.aiChatService
        .createConversation()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (session) => {
            this.conversations = [session, ...this.conversations];
            this.activeConversationId = session.id;
            this.messages = [];
            this.sendToConversation(session.id, text);
          },
          error: (err) => this.handleError('Impossible de démarrer la discussion', err),
        });
      return;
    }
    this.sendToConversation(this.activeConversationId, text);
  }

  onSuggestionSelected(text: string): void {
    this.onSendMessage(text);
  }

  private sendToConversation(conversationId: string, text: string): void {
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    };
    this.messages = [...this.messages, userMessage];
    this.sending = true;

    this.aiChatService
      .sendMessage(conversationId, text)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.sending = false))
      )
      .subscribe({
        next: (response) => {
          this.appendAssistantMessage(response);
          this.refreshSessionList(conversationId);
        },
        error: (err) => {
          this.messages = this.messages.filter((m) => m !== userMessage);
          this.handleError('Erreur lors de l\'envoi', err);
        },
      });
  }

  private appendAssistantMessage(response: AiChatResponse): void {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.reply,
      intent: response.intent,
      metadata: {
        rowCount: response.rowCount,
        columns: response.columns,
        preview: response.preview,
        sources: response.sources,
        suggestions: response.suggestions,
        sql: response.sql,
      },
    };
    this.messages = [...this.messages, assistantMessage];
  }

  private refreshSessionList(conversationId: string): void {
    this.aiChatService
      .listConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          this.conversations = sessions;
          this.activeConversationId = conversationId;
        },
      });
  }

  private handleError(title: string, err: unknown): void {
    const message =
      (err as { error?: { message?: string } })?.error?.message ||
      'Une erreur est survenue. Réessayez plus tard.';
    this.alertService.showError(message, title);
  }
}
