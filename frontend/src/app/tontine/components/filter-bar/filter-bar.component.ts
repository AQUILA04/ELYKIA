import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TontineMemberDeliveryStatus, TontineFilterBarParams } from '../../types/tontine.types';
import { ClientService } from 'src/app/client/service/client.service';

@Component({
  selector: 'app-tontine-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class TontineFilterBarComponent implements OnInit {
  @Input() resultCount = 0;
  @Input() downloading = false;
  @Input() downloadingCarnet = false;
  @Input() initialFilters: TontineFilterBarParams | null = null;
  currentSearchTerm: string = '';
  currentSelectedStatus: TontineMemberDeliveryStatus | 'ALL' = 'ALL';
  currentSelectedCommercial: string = 'ALL';
  currentCarnetStatus: 'ALL' | 'VERIFIED' | 'PENDING' = 'ALL';
  currentRegistrationSource: 'ALL' | 'CUSTOMER_SPACE' | 'STAFF' = 'ALL';
  commerciaux: any[] = [];

  @Output() filterChanged = new EventEmitter<TontineFilterBarParams & { commercial?: string }>();
  @Output() downloadPdf = new EventEmitter<string>();
  @Output() downloadCarnetPdf = new EventEmitter<{ verified: boolean; commercial?: string }>();

  TontineMemberDeliveryStatus = TontineMemberDeliveryStatus;

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.applyInitialFilters();
    this.loadAgents();
    this.emitFilterChanges();
  }

  private applyInitialFilters(): void {
    if (!this.initialFilters) {
      return;
    }
    if (this.initialFilters.search) {
      this.currentSearchTerm = this.initialFilters.search;
    }
    if (this.initialFilters.deliveryStatus && this.initialFilters.deliveryStatus !== 'ALL') {
      this.currentSelectedStatus = this.initialFilters.deliveryStatus;
    }
    if (this.initialFilters.commercial) {
      this.currentSelectedCommercial = this.initialFilters.commercial;
    }
    if (typeof this.initialFilters.carnetVerified === 'boolean') {
      this.currentCarnetStatus = this.initialFilters.carnetVerified ? 'VERIFIED' : 'PENDING';
    }
    if (this.initialFilters.registrationSource === 'CUSTOMER_SPACE'
        || this.initialFilters.registrationSource === 'STAFF') {
      this.currentRegistrationSource = this.initialFilters.registrationSource;
    }
  }

  loadAgents() {
    this.clientService.getAgents().subscribe(
      data => {
        this.commerciaux = data ?? [];
        this.ensureCommercialStillValid();
      },
      () => {
        this.commerciaux = [];
        this.ensureCommercialStillValid();
      }
    );
  }

  private ensureCommercialStillValid(): void {
    if (this.currentSelectedCommercial === 'ALL') {
      return;
    }
    const exists = this.commerciaux.some(
      (comm: { username?: string }) => comm?.username === this.currentSelectedCommercial
    );
    if (!exists) {
      this.currentSelectedCommercial = 'ALL';
      this.emitFilterChanges();
    }
  }

  onSearchEnter(): void {
    this.emitFilterChanges();
  }

  onStatusChange(value: TontineMemberDeliveryStatus | 'ALL'): void {
    this.currentSelectedStatus = value;
    this.emitFilterChanges();
  }

  onCarnetChange(value: 'ALL' | 'VERIFIED' | 'PENDING'): void {
    this.currentCarnetStatus = value;
    this.emitFilterChanges();
  }

  onRegistrationSourceChange(value: 'ALL' | 'CUSTOMER_SPACE' | 'STAFF'): void {
    this.currentRegistrationSource = value;
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
    this.currentCarnetStatus = 'ALL';
    this.currentRegistrationSource = 'ALL';
    this.emitFilterChanges();
  }

  onDownloadPdf(): void {
    if (this.currentSelectedCommercial === 'ALL' || this.downloading) {
      return;
    }
    this.downloadPdf.emit(this.currentSelectedCommercial);
  }

  onDownloadCarnetPdf(verified: boolean): void {
    if (this.downloadingCarnet) {
      return;
    }
    this.downloadCarnetPdf.emit({
      verified,
      commercial: this.currentSelectedCommercial !== 'ALL' ? this.currentSelectedCommercial : undefined
    });
  }

  private emitFilterChanges(): void {
    this.filterChanged.emit({
      search: this.currentSearchTerm || undefined,
      deliveryStatus: this.currentSelectedStatus !== 'ALL' ? this.currentSelectedStatus : undefined,
      commercial: this.currentSelectedCommercial !== 'ALL' ? this.currentSelectedCommercial : undefined,
      carnetVerified: this.currentCarnetStatus === 'ALL'
        ? undefined
        : this.currentCarnetStatus === 'VERIFIED',
      registrationSource: this.currentRegistrationSource !== 'ALL'
        ? this.currentRegistrationSource
        : undefined
    });
  }
}
