import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfilService, UserProfil } from '../../services/profil.service';

@Component({
    selector: 'app-profil-list',
    templateUrl: './profil-list.component.html',
    styleUrls: ['./profil-list.component.scss'],
    standalone: false
})
export class ProfilListComponent implements OnInit {
    displayedColumns: string[] = ['name', 'description', 'actions'];
    dataSource = new MatTableDataSource<UserProfil>([]);

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(private profilService: ProfilService, private snackBar: MatSnackBar) { }

    ngOnInit(): void {
        this.loadProfils();
    }

    loadProfils() {
        this.profilService.getAll(0, 100).subscribe(data => {
            // Handle both Page<T> and List<T> responses just in case
            const items = data.data.content ? data.data.content : (Array.isArray(data.data) ? data.data : []);
            this.dataSource.data = items;
            this.dataSource.paginator = this.paginator;
        });
    }

    deleteProfil(profil: UserProfil) {
        if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profil.name}" ?`)) {
            this.profilService.delete(profil.id!).subscribe(() => {
                this.snackBar.open('Profil supprimé', 'Fermer', { duration: 3000 });
                this.loadProfils();
            });
        }
    }
}
