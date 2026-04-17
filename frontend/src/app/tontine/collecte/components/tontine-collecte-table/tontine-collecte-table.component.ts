import { Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { TontineCollectionWebDto } from '../../../models/tontine-collecte.model';

@Component({
  selector: 'app-tontine-collecte-table',
  templateUrl: './tontine-collecte-table.component.html',
  styleUrls: ['./tontine-collecte-table.component.scss'],
  standalone: false
})
export class TontineCollecteTableComponent implements AfterViewInit {

  @Input() isLoading: boolean = false;
  @Input() collectes: TontineCollectionWebDto[] = [];

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;

  get paginatedCollectes(): TontineCollectionWebDto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.collectes.slice(start, start + this.itemsPerPage);
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex + 1;
    this.itemsPerPage = event.pageSize;
  }

  // Stub required by AfterViewInit (paginator now managed by mat-paginator in template)
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {}
}
