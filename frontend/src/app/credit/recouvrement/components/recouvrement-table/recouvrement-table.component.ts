import { Component, Input } from '@angular/core';
import { RecouvrementWebDto } from '../../../models/recouvrement.model';

@Component({
  selector: 'app-recouvrement-table',
  templateUrl: './recouvrement-table.component.html',
  styleUrls: ['./recouvrement-table.component.scss'],
  standalone: false
})
export class RecouvrementTableComponent {
  @Input() recouvrements: RecouvrementWebDto[] = [];
  @Input() isLoading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;

  get paginatedRecouvrements(): RecouvrementWebDto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.recouvrements.slice(start, start + this.itemsPerPage);
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex + 1;
    this.itemsPerPage = event.pageSize;
  }
}
