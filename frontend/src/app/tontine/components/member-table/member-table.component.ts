import { Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { TontineMember, formatCurrency, formatDate, getDeliveryStatusLabel, getDeliveryStatusColor, TontineMemberDeliveryStatus, PaginatedResponse } from '../../types/tontine.types';

@Component({
  selector: 'app-tontine-member-table',
  templateUrl: './member-table.component.html',
  styleUrls: ['./member-table.component.scss']
})
export class TontineMemberTableComponent implements OnChanges, AfterViewInit {
  @Input() loading: boolean = false;
  @Input() paginatedResponse: PaginatedResponse<TontineMember> | null = null;
  @Input() pageSize: number = 20; // Default page size
  @Input() currentPage: number = 0; // Default current page (0-indexed)
  @Input() totalElements: number = 0;

  @Output() memberClick = new EventEmitter<TontineMember>();
  @Output() pageChange = new EventEmitter<{ page: number, size: number }>();
  @Output() sortChange = new EventEmitter<string>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) matSort!: MatSort;

  displayedColumns: string[] = ['client', 'totalContribution', 'commercial', 'deliveryStatus', 'registrationDate', 'actions'];
  dataSource = new MatTableDataSource<TontineMember>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paginatedResponse'] && this.paginatedResponse) {
      this.dataSource = new MatTableDataSource(this.paginatedResponse.content ? [...this.paginatedResponse.content] : []);
      if (this.paginatedResponse.page) {
        this.totalElements = this.paginatedResponse.page.totalElements;
        this.pageSize = this.paginatedResponse.page.size;
        this.currentPage = this.paginatedResponse.page.number;
      } else {
        this.totalElements = this.paginatedResponse.totalElements || 0;
        this.pageSize = this.paginatedResponse.size || 20;
        this.currentPage = this.paginatedResponse.number || 0;
      }
    }
  }

  ngAfterViewInit() {
    if (this.matSort) {
      this.dataSource.sort = this.matSort;
      this.matSort.sortChange.subscribe((sortEvent: Sort) => {
        const sortString = `${sortEvent.active},${sortEvent.direction}`;
        this.sortChange.emit(sortString);
      });
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, size: event.pageSize });
  }

  getClientName(member: TontineMember): string {
    return `${member.client.firstname} ${member.client.lastname}`;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatDate(date: string): string {
    return formatDate(date);
  }

  getStatusLabel(status: TontineMemberDeliveryStatus): string {
    return getDeliveryStatusLabel(status);
  }

  getStatusColor(status: TontineMemberDeliveryStatus): string {
    return getDeliveryStatusColor(status);
  }

  getStatusBadgeClass(status: TontineMemberDeliveryStatus): string {
    const map: Record<string, string> = {
      SESSION_INPROGRESS: 'status-inprogress',
      PENDING: 'status-pending',
      VALIDATED: 'status-validated',
      DELIVERED: 'status-delivered'
    };
    return map[status] || 'status-inprogress';
  }

  getCommercial(member: TontineMember): string {
    return member.client?.tontineCollector || '—';
  }

  getInitials(name: string): string {
    if (!name || name === '—') return '?';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onViewDetails(member: TontineMember): void {
    this.memberClick.emit(member);
  }
}

