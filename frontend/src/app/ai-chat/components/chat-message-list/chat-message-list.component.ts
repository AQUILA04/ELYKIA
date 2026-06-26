import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChatMessage } from '../../models/ai-chat.models';

@Component({
  selector: 'app-chat-message-list',
  templateUrl: './chat-message-list.component.html',
  styleUrls: ['./chat-message-list.component.scss'],
})
export class ChatMessageListComponent {
  @Input() messages: ChatMessage[] = [];
  @Input() sending = false;
  @Input() showSql = false;

  @Output() suggestionSelected = new EventEmitter<string>();

  isUser(role: string): boolean {
    return role === 'user' || role === 'USER';
  }

  isDataIntent(message: ChatMessage): boolean {
    return message.intent === 'DATA' || (message.metadata?.preview?.length ?? 0) > 0;
  }

  isHowToIntent(message: ChatMessage): boolean {
    return message.intent === 'HOW_TO' || (message.metadata?.sources?.length ?? 0) > 0;
  }

  getPreviewColumns(message: ChatMessage): string[] {
    if (message.metadata?.columns?.length) {
      return message.metadata.columns;
    }
    const first = message.metadata?.preview?.[0];
    return first ? Object.keys(first) : [];
  }

  onSuggestion(text: string): void {
    this.suggestionSelected.emit(text);
  }
}
