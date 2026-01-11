import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ParameterService } from '../parameter.service';
import { Parameter } from '../parameter.model';
import { ParameterEditComponent } from '../parameter-edit/parameter-edit.component';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-parameter-list',
  templateUrl: './parameter-list.component.html',
  styleUrls: ['./parameter-list.component.scss']
})
export class ParameterListComponent implements OnInit {
  parameters: Parameter[] = [];
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private parameterService: ParameterService,
    private dialog: MatDialog,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadParameters();
  }

  loadParameters(): void {
    this.spinner.show();
    this.parameterService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.parameters = response.data.content;
        this.totalElements = response.data.page.totalElements;
        this.spinner.hide();
      },
      error: (error) => {
        this.spinner.hide();
        this.toastr.error('Erreur lors du chargement des paramètres', 'Erreur');
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadParameters();
  }

  refresh(): void {
    this.loadParameters();
  }

  addParameter(): void {
    const dialogRef = this.dialog.open(ParameterEditComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadParameters();
      }
    });
  }

  editParameter(parameter: Parameter): void {
    const dialogRef = this.dialog.open(ParameterEditComponent, {
      width: '600px',
      data: { mode: 'edit', parameter: parameter }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadParameters();
      }
    });
  }

  deleteParameter(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: "Vous ne pourrez pas revenir en arrière!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.spinner.show();
        this.parameterService.delete(id).subscribe({
          next: () => {
            this.spinner.hide();
            this.toastr.success('Paramètre supprimé avec succès', 'Succès');
            this.loadParameters();
          },
          error: (error) => {
            this.spinner.hide();
            this.toastr.error('Erreur lors de la suppression du paramètre', 'Erreur');
          }
        });
      }
    });
  }

  isBoolean(value: string): boolean {
    return value === 'true' || value === 'false';
  }

  formatValue(value: string): string {
    if (value === 'true') return 'OUI';
    if (value === 'false') return 'NON';
    return value;
  }
}
