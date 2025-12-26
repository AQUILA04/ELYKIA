import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { Observable, of, from, combineLatest } from 'rxjs';
import { filter, map, switchMap, tap, catchError, startWith, shareReplay } from 'rxjs/operators';
import { ClientView } from 'src/app/models/client-view.model';
import { User } from 'src/app/models/auth.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { selectClientsForRecovery } from 'src/app/store/recovery/recovery.selectors';
import { LoggerService } from 'src/app/core/services/logger.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FormControl } from '@angular/forms';

interface GroupedClients {
  quarter: string;
  clients: ClientView[];
}

@Component({
  selector: 'app-recovery-client-list',
  templateUrl: './recovery-client-list.page.html',
  styleUrls: ['./recovery-client-list.page.scss'],
  standalone: false
})
export class RecoveryClientListPage implements OnInit {

  searchControl = new FormControl('');
  groupedClients$: Observable<GroupedClients[]> = new Observable();

  constructor(
    private store: Store,
    private router: Router,
    private log: LoggerService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.log.log('[RecoveryClientListPage] ngOnInit started');

    const baseGroups$ = this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user),
      switchMap(user => this.store.select(selectClientsForRecovery(user.username))),
      switchMap(clients => this.addPhotosToClients(clients)),
      map(clients => this.groupClientsByQuarter(clients)),
      shareReplay(1)
    );

    const searchTerm$ = this.searchControl.valueChanges.pipe(
      startWith('')
    );

    this.groupedClients$ = combineLatest([baseGroups$, searchTerm$]).pipe(
      map(([groups, searchTerm]) => {
        const lowerCaseSearchTerm = (searchTerm || '').toLowerCase().trim();

        if (!lowerCaseSearchTerm) {
          return groups;
        }

        const quarterMatch = groups.find(g => g.quarter.toLowerCase() === lowerCaseSearchTerm);
        if (quarterMatch) {
          return [quarterMatch];
        }

        const filteredGroups = groups.map(group => {
          const filteredClients = group.clients.filter(client => {
            const clientName = client.fullName || `${client.firstname} ${client.lastname}`;
            return clientName.toLowerCase().includes(lowerCaseSearchTerm);
          });
          return { ...group, clients: filteredClients };
        })
        .filter(group => group.clients.length > 0);

        return filteredGroups;
      }),
      tap(groupedClients => this.log.log(`[RecoveryClientListPage] Displaying ${groupedClients.length} groups after search.`))
    );
  }

  private addPhotosToClients(clients: ClientView[]): Observable<ClientView[]> {
    if (clients.length === 0) {
      return of([]);
    }
    const clientsWithPhotos$ = clients.map(client =>
      this.getPhotoUrl(client.profilPhoto).pipe(
        map(photoUrl => ({ ...client, photoUrl }))
      )
    );
    return combineLatest(clientsWithPhotos$);
  }

  private groupClientsByQuarter(clients: ClientView[]): GroupedClients[] {
    if (!clients) {
      return [];
    }

    const grouped = clients.reduce((acc, client) => {
      const quarter = client.quarter || 'Non spécifié';
      if (!acc[quarter]) {
        acc[quarter] = [];
      }
      acc[quarter].push(client);
      return acc;
    }, {} as { [key: string]: ClientView[] });

    return Object.keys(grouped).map(quarter => ({
      quarter,
      clients: grouped[quarter].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    }));
  }

  getPhotoUrl(path: string | undefined): Observable<SafeUrl> {
    if (!path || path.includes('person-circle-outline')) {
      return of('assets/icon/person-circle-outline.svg');
    }

    if (path.startsWith('http')) {
      return of(this.sanitizer.bypassSecurityTrustUrl(path));
    }

    return from(Filesystem.readFile({
      path,
      directory: Directory.Data
    })).pipe(
      map(file => {
        const base64Data = `data:image/png;base64,${file.data}`;
        return this.sanitizer.bypassSecurityTrustUrl(base64Data);
      }),
      catchError(() => {
        return of('assets/icon/favicon.png'); // Fallback image
      })
    );
  }

  openRecoveryPage(clientId: string) {
    this.router.navigate(['/recovery'], { queryParams: { clientId: clientId } });
  }
}
