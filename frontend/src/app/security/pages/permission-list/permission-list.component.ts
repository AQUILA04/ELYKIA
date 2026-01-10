import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionService, UserPermission } from '../../services/permission.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
    selector: 'app-permission-list',
    templateUrl: './permission-list.component.html',
    styleUrls: ['./permission-list.component.scss'],
    standalone: false
})
export class PermissionListComponent implements OnInit {
    displayedColumns: string[] = ['name', 'actions'];
    dataSource = new MatTableDataSource<UserPermission>([]);

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(private permissionService: PermissionService, private snackBar: MatSnackBar, private alertService: AlertService) { }

    ngOnInit(): void {
        this.loadPermissions();
    }

    loadPermissions() {
        this.permissionService.getAll(0, 100).subscribe(data => {
            const items = data.data.content ? data.data.content : (Array.isArray(data.data) ? data.data : []);
            this.dataSource.data = items;
            this.dataSource.paginator = this.paginator;
        });
    }

    deletePermission(permission: UserPermission) {
        this.alertService.showConfirmation('Confirmation', `Êtes-vous sûr de vouloir supprimer la permission "${permission.name}" ?`).then((confirmed) => {
            if (confirmed) {
                this.permissionService.delete(permission.id!).subscribe(() => {
                    this.snackBar.open('Permission supprimée', 'Fermer', { duration: 3000 });
                    this.loadPermissions();
                });
            }
        });
    }
}
