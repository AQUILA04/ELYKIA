import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss'],
})
export class ChatInputComponent {
  @Input() disabled = false;
  @Input() domains: string[] = [];

  @Output() send = new EventEmitter<string>();

  message = '';

  onSubmit(): void {
    const text = this.message.trim();
    if (!text || this.disabled) {
      return;
    }
    this.send.emit(text);
    this.message = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  useDomain(domain: string): void {
    this.message = `Question sur ${domain} : `;
  }
}
