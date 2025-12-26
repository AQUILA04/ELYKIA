import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { TontineMemberDeliveryStatus, TontineFilterBarParams } from '../../types/tontine.types';
import { ClientService } from 'src/app/client/service/client.service';

@Component({
  selector: 'app-tontine-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class TontineFilterBarComponent implements OnInit {
  currentSearchTerm: string = '';
  currentSelectedStatus: TontineMemberDeliveryStatus | 'ALL' = 'ALL';
  currentSelectedCommercial: string = 'ALL';
  commerciaux: any[] = [];

  @Output() filterChanged = new EventEmitter<TontineFilterBarParams & { commercial?: string }>();

  TontineMemberDeliveryStatus = TontineMemberDeliveryStatus;

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.loadAgents();
    this.emitFilterChanges();
  }

  loadAgents() {
    this.clientService.getAgents().subscribe(
      data => { this.commerciaux = data ?? []; },
      () => { this.commerciaux = []; }
    );
  }

  onSearchChange(value: string): void {
    this.currentSearchTerm = value;
    this.emitFilterChanges();
  }

  onStatusChange(value: TontineMemberDeliveryStatus | 'ALL'): void {
    this.currentSelectedStatus = value;
    this.emitFilterChanges();
  }

  onCommercialChange(username: string) {
    this.currentSelectedCommercial = username;
    this.emitFilterChanges();
  }

  clearFilters(): void {
    this.currentSearchTerm = '';
    this.currentSelectedStatus = 'ALL';
    this.currentSelectedCommercial = 'ALL';
    this.emitFilterChanges();
  }

  private emitFilterChanges(): void {
    this.filterChanged.emit({
      search: this.currentSearchTerm || undefined,
      deliveryStatus: this.currentSelectedStatus !== 'ALL' ? this.currentSelectedStatus : undefined,
      commercial: this.currentSelectedCommercial !== 'ALL' ? this.currentSelectedCommercial : undefined
    });
  }
}
