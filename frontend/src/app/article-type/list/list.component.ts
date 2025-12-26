import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { ArticleTypeService, ArticleType } from '../service/article-type.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  types: ArticleType[] = [];
  page = 0;
  size = 10;
  totalElements = 0;
  search = '';

  constructor(
    private articleTypeService: ArticleTypeService,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.getList();
  }

  getList(): void {
    this.spinner.show();
    this.articleTypeService.getTypes(this.page, this.size, this.search).subscribe(
      res => {
        if (res.statusCode === 200) {
          this.types = res.data.content;
          this.totalElements = res.data.totalElements;
        }
        this.spinner.hide();
      },
      error => {
        console.error('Error fetching types', error);
        this.alertService.showError('Erreur lors du chargement des types');
        this.spinner.hide();
      }
    );
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.getList();
  }

  onDelete(id: number): void {
    this.alertService.showDeleteConfirmation('Êtes-vous sûr de vouloir supprimer ce type ?')
      .then((result) => {
        if (result) {
          this.articleTypeService.deleteType(id).subscribe(
            () => {
              this.alertService.showSuccess('Type supprimé avec succès');
              this.getList();
            },
            error => {
              console.error('Error deleting type', error);
              this.alertService.showError('Erreur lors de la suppression');
            }
          );
        }
      });
  }

  onSearch(): void {
    this.page = 0;
    this.getList();
  }
}
