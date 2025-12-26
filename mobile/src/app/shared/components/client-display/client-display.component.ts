import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Client } from '../../../models/client.model';

@Component({
  selector: 'app-client-display',
  templateUrl: './client-display.component.html',
  styleUrls: ['./client-display.component.scss'],
  standalone: false
})
export class ClientDisplayComponent {
  @Input() selectedClient: Client | null = null;
  @Input() allowChange: boolean = true;
  @Input() title: string = 'Client Sélectionné';

  @Output() clientSelect = new EventEmitter<void>();

  getAvatarColor(firstName: string): string {
    const colors = [
      '#FF6B35', '#2E8B57', '#4682B4', '#8B4513', '#9932CC',
      '#DC143C', '#008B8B', '#B8860B', '#8B008B', '#556B2F'
    ];
    const index = firstName ? firstName.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }

  onSelectClient() {
    this.clientSelect.emit();
  }
}