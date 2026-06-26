import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConversationSummary } from '../../models/ai-chat.models';

@Component({
  selector: 'app-conversation-sidebar',
  templateUrl: './conversation-sidebar.component.html',
  styleUrls: ['./conversation-sidebar.component.scss'],
})
export class ConversationSidebarComponent {
  @Input() conversations: ConversationSummary[] = [];
  @Input() activeId: string | null = null;
  @Input() loading = false;

  @Output() selectConversation = new EventEmitter<string>();
  @Output() newConversation = new EventEmitter<void>();
  @Output() deleteConversation = new EventEmitter<string>();

  onSelect(id: string): void {
    this.selectConversation.emit(id);
  }

  onNew(): void {
    this.newConversation.emit();
  }

  onDelete(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.deleteConversation.emit(id);
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
