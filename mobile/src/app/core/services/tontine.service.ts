import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, concat, forkJoin } from 'rxjs';
import { catchError, map, switchMap, tap, take, toArray } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { environment } from 'src/environments/environment';
import { LoggerService } from './logger.service';
import { Store } from '@ngrx/store';
import { selectAuthUser, selectToken } from '../../store/auth/auth.selectors';
import { TontineMemberView } from 'src/app/models/tontine.model';
import { TontineCollectionRepository } from '../repositories/tontine-collection.repository';
import { TontineMemberRepositoryExtensions } from '../repositories/tontine-member.repository.extensions';
import { TontineCollectionRepositoryExtensions } from '../repositories/tontine-collection.repository.extensions';
import { TontineDeliveryRepositoryExtensions } from '../repositories/tontine-delivery.repository.extensions';
import { TontineStockRepositoryExtensions } from '../repositories/tontine-stock.repository.extensions';
import { TontineMemberRepository } from '../repositories/tontine-member.repository';

@Injectable({
    providedIn: 'root'
})
export class TontineService {
    private apiUrl = environment.apiUrl + '/api/v1';
    private commercialUsername: string | undefined;

    constructor(
        private http: HttpClient,
        private dbService: DatabaseService,
        private log: LoggerService,
        private store: Store,
        private collectionRepo: TontineCollectionRepository,
        private tontineMemberRepositoryExtensions: TontineMemberRepositoryExtensions,
        private tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions,
        private tontineDeliveryRepositoryExtensions: TontineDeliveryRepositoryExtensions,
        private tontineStockRepositoryExtensions: TontineStockRepositoryExtensions,
        private memberRepo: TontineMemberRepository // Inject repository
    ) {
        this.store.select(selectAuthUser).subscribe(user => {
            this.commercialUsername = user?.username;
        });
    }

    private getHeaders(): Observable<HttpHeaders> {
        return this.store.select(selectToken).pipe(
            take(1),
            map(token => {
                let headers = new HttpHeaders();
                if (token) {
                    headers = headers.set('Authorization', `Bearer ${token}`);
                }
                return headers;
            })
        );
    }

    /**
     * Initialize Tontine Data (Session, Members, Stocks, etc.)
     */
    initializeTontine(commercialUsername?: string): Observable<boolean> {
        if (commercialUsername) {
            this.commercialUsername = commercialUsername;
        }
        console.log(`TontineService: Initializing tontine data for ${this.commercialUsername}...`);
        return this.fetchAndSaveSession().pipe(
            switchMap(session => {
                if (session) {
                    console.log('TontineService: Session found, fetching members and stocks...', session.id);
                    return forkJoin({
                        members: this.fetchAndSaveMembers(session.id).pipe(
                            switchMap(() => this.fetchAndSaveCollections())
                        ),
                        stocks: this.fetchAndSaveStocks(session.id)
                    }).pipe(
                        map(() => {
                            console.log('TontineService: Tontine initialization completed successfully.');
                            return true;
                        })
                    );
                }
                console.log('TontineService: No active session found.');
                return of(true);
            }),
            catchError(error => {
                console.error('TontineService: Error initializing tontine:', error);
                this.log.log('TontineService: Error initializing tontine: ' + JSON.stringify(error));
                return of(false);
            })
        );
    }

    /**
     * Fetch active session from API and save to DB
     */
    fetchAndSaveSession(): Observable<any> {
        console.log('TontineService: Fetching active session...');
        return this.getHeaders().pipe(
            switchMap(headers => this.http.get<any>(`${this.apiUrl}/tontines/sessions/current`, { headers })),
            map(response => {
                return response.data;
            }),
            switchMap(session => {
                if (session) {
                    return from(this.dbService.saveTontineSession(session)).pipe(
                        map(() => session),
                        catchError(err => {
                            console.error('TontineService: Error saving session to DB:', err);
                            throw err;
                        })
                    );
                }
                return of(null);
            }),
            catchError(error => {
                console.error('TontineService: Error fetching tontine session:', error);
                return of(null);
            })
        );
    }

    /**
     * Fetch members for a session and save to DB with pagination support
     */
    fetchAndSaveMembers(sessionId: string, page: number = 0, size: number = 100): Observable<any> {
        console.log(`TontineService: Fetching members for session ${sessionId}, page ${page}...`);

        return forkJoin({
            headers: this.getHeaders(),
            unsyncedTotals: from(this.dbService.getUnsyncedCollectionsTotals())
        }).pipe(
            switchMap(({ headers, unsyncedTotals }) => {
                // Convert unsyncedTotals to Map for easy lookup
                const unsyncedMap = new Map<string, number>();
                unsyncedTotals.forEach(t => unsyncedMap.set(String(t.tontineMemberId), t.total));

                return this.http.get<any>(`${this.apiUrl}/tontines/members?page=${page}&size=${size}`, { headers }).pipe(
                    switchMap(response => {
                        const pageData = response.data;
                        const members = pageData.content || [];
                        const currentPage = pageData.page.number || 0;
                        const totalPages = pageData.page.totalPages || 1;
                        const totalElements = pageData.page.totalElements || 0;

                        console.log(`TontineService: Page ${currentPage + 1}/${totalPages} - ${members.length} members found (Total: ${totalElements})`);

                        if (members.length === 0) {
                            console.log('TontineService: No members on this page.');
                            return of(null);
                        }

                        // Map API response to DB structure
                        const mappedMembers = members.map((m: any) => {
                            // Add local unsynced total to server total to prevent "dip"
                            const serverTotal = m.totalContribution || 0;
                            const memberIdStr = String(m.id);
                            const localUnsynced = unsyncedMap.get(memberIdStr) || 0;
                            const adjustedTotal = serverTotal + localUnsynced;

                            if (serverTotal > 0 && adjustedTotal === 0) {
                                console.warn(`TontineService: WARNING - Member ${m.id} has serverTotal ${serverTotal} but adjustedTotal is 0! (Local Unsynced: ${localUnsynced})`);
                            } else if (serverTotal > 0) {
                                console.log(`TontineService: Member ${m.id} - Server Total: ${serverTotal} + Local Unsynced: ${localUnsynced} = ${adjustedTotal}`);
                            }

                            return {
                                id: m.id,
                                tontineSessionId: sessionId,
                                clientId: m.client?.id,
                                commercialUsername: this.commercialUsername,
                                totalContribution: adjustedTotal,
                                deliveryStatus: m.deliveryStatus,
                                registrationDate: m.registrationDate,
                                frequency: m.frequency,
                                amount: m.amount,
                                notes: m.notes,
                                isLocal: false,
                                isSync: true
                            };
                        });

                        const deliveries: any[] = [];
                        members.forEach((m: any) => {
                            if (m.delivery) {
                                deliveries.push({
                                    id: m.delivery.id,
                                    tontineMemberId: m.id,
                                    commercialUsername: this.commercialUsername,
                                    requestDate: m.delivery.requestDate,
                                    deliveryDate: m.delivery.deliveryDate,
                                    totalAmount: m.delivery.totalAmount,
                                    status: m.delivery.status,
                                    isLocal: false,
                                    isSync: true,
                                    items: m.delivery.items ? m.delivery.items.map((i: any) => {
                                        // API returns 'articles' (plural) or 'article', and also 'articleId' directly
                                        const articleId = i.articleId || i.articles?.id || i.article?.id;

                                        return {
                                            id: i.id,
                                            tontineDeliveryId: m.delivery.id,
                                            articleId: articleId,
                                            quantity: i.quantity,
                                            unitPrice: i.unitPrice,
                                            totalPrice: i.totalPrice
                                        };
                                    }) : []
                                });
                            }
                        });

                        console.log(`TontineService: Saving ${mappedMembers.length} members and ${deliveries.length} deliveries from page ${currentPage + 1}...`);

                        // Save current batch immediately
                        return from(this.dbService.saveTontineMembers(mappedMembers)).pipe(
                            switchMap(() => {
                                if (deliveries.length > 0) {
                                    return from(this.dbService.saveTontineDeliveries(deliveries));
                                }
                                return of(void 0);
                            }),
                            tap(() => console.log(`TontineService: Page ${currentPage + 1}/${totalPages} saved successfully.`)),

                            switchMap(() => {
                                // Check if there are more pages to fetch
                                if (currentPage < totalPages - 1) {
                                    console.log(`TontineService: Fetching next page (${currentPage + 2}/${totalPages})...`);
                                    // Recursively fetch next page
                                    return this.fetchAndSaveMembers(sessionId, currentPage + 1, size);
                                } else {
                                    console.log(`TontineService: All ${totalPages} pages fetched and saved successfully.`);

                                    // DO NOT Recalculate totals here.
                                    // 1. It wipes out the server-provided total (which is authoritative).
                                    // 2. Collections are not yet fetched at this point!
                                    console.log('TontineService: Members sync completed. Preserving server totals.');
                                    return of(null);
                                }
                            }),
                            catchError(err => {
                                console.error(`TontineService: Error saving page ${currentPage + 1}:`, err);
                                this.log.log(`TontineService: Error saving page ${currentPage + 1}: ${JSON.stringify(err)}`);
                                throw err;
                            })
                        );
                    })
                );
            }),
            catchError(error => {
                console.error(`TontineService: Error fetching members page ${page}:`, error);
                this.log.log(`TontineService: Error fetching members page ${page}: ${JSON.stringify(error)}`);
                return of(null);
            })
        );
    }

    /**
     * Fetch collections for a specific member and save to DB with pagination support
     */
    fetchAndSaveMemberCollections(memberId: string, page: number = 0, size: number = 50): Observable<any> {
        console.log(`TontineService: Fetching collections for member ${memberId}, page ${page}...`);

        return this.getHeaders().pipe(
            switchMap(headers => this.http.get<any>(`${this.apiUrl}/tontines/members/${memberId}/collections?page=${page}&size=${size}`, { headers })),
            switchMap(response => {
                const pageData = response.data;
                const collections = pageData.content || [];
                const currentPage = pageData.page.number || 0;
                const totalPages = pageData.page.totalPages || 1;

                console.log(`TontineService: Member ${memberId} - Page ${currentPage + 1}/${totalPages} - ${collections.length} collections found`);

                if (collections.length === 0) {
                    console.log(`TontineService: No collections for member ${memberId}.`);
                    return of(null);
                }

                // Map API response to DB structure
                const mappedCollections = collections.map((c: any) => ({
                    id: c.id,
                    tontineMemberId: memberId,
                    amount: c.amount,
                    collectionDate: c.collectionDate,
                    commercialUsername: this.commercialUsername,
                    isLocal: false,
                    isSync: true
                }));

                console.log(`TontineService: Saving ${mappedCollections.length} collections for member ${memberId}...`);

                // Save current batch immediately
                return from(this.dbService.saveTontineCollections(mappedCollections)).pipe(
                    tap(() => console.log(`TontineService: Collections page ${currentPage + 1}/${totalPages} saved for member ${memberId}.`)),
                    switchMap(() => {
                        // Check if there are more pages to fetch
                        if (currentPage < totalPages - 1) {
                            console.log(`TontineService: Fetching next collections page (${currentPage + 2}/${totalPages}) for member ${memberId}...`);
                            // Recursively fetch next page
                            return this.fetchAndSaveMemberCollections(memberId, currentPage + 1, size);
                        } else {
                            console.log(`TontineService: All collections fetched for member ${memberId}.`);
                            return of(null);
                        }
                    }),
                    catchError(err => {
                        console.error(`TontineService: Error saving collections for member ${memberId}:`, err);
                        this.log.log(`TontineService: Error saving collections for member ${memberId}: ${JSON.stringify(err)}`);
                        // Don't throw - continue with other members
                        return of(null);
                    })
                );
            }),
            catchError(error => {
                console.error(`TontineService: Error fetching collections for member ${memberId}:`, error);
                this.log.log(`TontineService: Error fetching collections for member ${memberId}: ${JSON.stringify(error)}`);
                // Don't throw - continue with other members
                return of(null);
            })
        );
    }

    /**
     * Fetch all collections and save to DB with pagination support
     */
    fetchAndSaveCollections(page: number = 0, size: number = 100): Observable<any> {
        console.log(`TontineService: Fetching all collections, page ${page}...`);

        return this.getHeaders().pipe(
            switchMap(headers => this.http.get<any>(`${this.apiUrl}/tontines/collections?page=${page}&size=${size}`, { headers })),
            switchMap(response => {
                const pageData = response.data;
                const collections = pageData.content || [];
                const currentPage = pageData.page.number || 0;
                const totalPages = pageData.page.totalPages || 1;
                const totalElements = pageData.page.totalElements || 0;

                console.log(`TontineService: Collections Page ${currentPage + 1}/${totalPages} - ${collections.length} collections found (Total: ${totalElements})`);

                if (collections.length === 0) {
                    console.log('TontineService: No collections found on page.');
                    return of(null);
                }

                // Map API response to DB structure
                const mappedCollections = collections.map((c: any) => ({
                    id: c.id,
                    tontineMemberId: c.tontineMemberId || c.tontineMember?.id || c.member?.id,
                    amount: c.amount,
                    collectionDate: c.collectionDate,
                    commercialUsername: this.commercialUsername,
                    isLocal: false,
                    isSync: true
                }));

                console.log(`TontineService: Saving ${mappedCollections.length} collections from page ${currentPage + 1}...`);

                // Save current batch immediately
                return from(this.dbService.saveTontineCollections(mappedCollections)).pipe(
                    tap(() => console.log(`TontineService: Collections page ${currentPage + 1}/${totalPages} saved successfully.`)),
                    switchMap(() => {
                        // Check if there are more pages to fetch
                        if (currentPage < totalPages - 1) {
                            console.log(`TontineService: Fetching next collections page (${currentPage + 2}/${totalPages})...`);
                            // Recursively fetch next page
                            return this.fetchAndSaveCollections(currentPage + 1, size);
                        } else {
                            console.log(`TontineService: All ${totalPages} collections pages fetched and saved successfully.`);
                            // DO NOT Recalculate totals here.
                            // The member total is already correctly set (Server Total + Unsynced Local Delta) in fetchAndSaveMembers.
                            // Re-summing local collections can be inaccurate if the device doesn't hold the full history.
                            return of(null);
                        }
                    }),
                    catchError(err => {
                        console.error(`TontineService: Error saving collections page ${currentPage + 1}:`, err);
                        this.log.log(`TontineService: Error saving collections page ${currentPage + 1}: ${JSON.stringify(err)}`);
                        throw err;
                    })
                );
            }),
            catchError(error => {
                console.error(`TontineService: Error fetching collections page ${page}:`, error);
                this.log.log(`TontineService: Error fetching collections page ${page}: ${JSON.stringify(error)}`);
                return of(null);
            })
        );
    }

    /**
     * Get session from local DB
     */
    getSession(): Observable<any> {
        return from(this.dbService.getTontineSession());
    }

    /**
     * Get members from local DB
     */
    getMembers(sessionId: string): Observable<TontineMemberView[]> {
        if (!this.commercialUsername) return of([]);
        return from(this.dbService.getTontineMembers(sessionId, this.commercialUsername)) as Observable<TontineMemberView[]>;
    }

    /**
     * Get collections from local DB
     */
    getCollections(commercialUsername?: string): Observable<any[]> {
        const username = commercialUsername || this.commercialUsername;
        console.log('TontineService.getCollections: commercialUsername =', username);
        if (!username) {
            console.log('TontineService.getCollections: No commercialUsername - returning empty array');
            return of([]);
        }
        console.log('TontineService.getCollections: Calling dbService.getTontineCollectionsByCommercial');
        return from(this.dbService.getTontineCollectionsByCommercial(username)).pipe(
            tap(collections => {
                console.log('TontineService.getCollections: Retrieved', collections?.length || 0, 'collections');
            })
        );
    }

    /**
     * Sync local changes to server
     */
    syncTontine(): Observable<void> {
        // Implement sync logic here (upload local members, collections, etc.)
        return of(void 0);
    }

    /**
     * Fetch and save tontine stocks from API
     */
    fetchAndSaveStocks(sessionId?: string): Observable<any> {
        console.log('TontineService: Fetching tontine stocks...');

        return this.getHeaders().pipe(
            switchMap(headers => this.http.get<any>(`${this.apiUrl}/tontines/stock`, { headers })),
            switchMap(response => {
                // Handle case where response.data is null or undefined
                const stocks = response.data.content || [];

                // Ensure stocks is an array before checking length or mapping
                if (!Array.isArray(stocks)) {
                    return of(null);
                }

                console.log(`TontineService: ${stocks.length} stocks found`);

                if (stocks.length === 0) {
                    return of(null);
                }

                // Map API response to DB structure
                const mappedStocks = stocks.map((s: any) => ({
                    id: s.id?.toString() || this.generateUuid(),
                    commercial: s.commercial || this.commercialUsername,
                    creditId: s.creditId?.toString(),
                    articleId: s.articleId?.toString(),
                    articleName: s.articleName,
                    unitPrice: s.unitPrice || 0,
                    totalQuantity: s.totalQuantity || 0,
                    availableQuantity: s.availableQuantity || 0,
                    distributedQuantity: s.distributedQuantity || 0,
                    year: s.year,
                    tontineSessionId: s.tontineSessionId?.toString() || sessionId
                }));

                console.log('TontineService: Saving stocks to DB...');
                return from(this.dbService.saveTontineStocks(mappedStocks)).pipe(
                    tap(() => console.log('TontineService: Stocks saved successfully')),
                    map(() => null)
                );
            }),
            catchError(error => {
                console.error('TontineService: Error fetching stocks:', error);
                this.log.log('TontineService: Error fetching stocks: ' + JSON.stringify(error));
                return of(null);
            })
        );
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get paginated tontine members (Native Views)
     *
     * @param sessionId Tontine Session ID
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineMemberView
     */
    getTontineMembersPaginated(
        sessionId: string,
        page: number,
        size: number,
        filters?: any
    ): Observable<any> {
        if (!this.commercialUsername) {
            return of({ content: [], totalElements: 0, totalPages: 0, page, size });
        }
        return from(this.tontineMemberRepositoryExtensions.findBySessionAndCommercialPaginated(
            sessionId,
            this.commercialUsername,
            page,
            size,
            filters
        )).pipe(
            catchError(error => {
                console.error('Failed to load paginated tontine members:', error);
                return of({ content: [], totalElements: 0, totalPages: 0, page, size });
            })
        );
    }
    /**
     * Get paginated tontine collections (Native Views)
     *
     * @param commercialUsername Username (optional, defaults to current user)
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineCollectionView
     */
    getTontineCollectionsPaginated(
        page: number,
        size: number,
        filters?: any
    ): Observable<any> {
        if (!this.commercialUsername) {
            return of({ content: [], totalElements: 0, totalPages: 0, page, size });
        }
        return from(this.tontineCollectionRepositoryExtensions.findViewsByCommercialPaginated(
            this.commercialUsername,
            page,
            size,
            filters
        )).pipe(
            catchError(error => {
                console.error('Failed to load paginated tontine collections:', error);
                return of({ content: [], totalElements: 0, totalPages: 0, page, size });
            })
        );
    }

    /**
     * Get paginated tontine deliveries (Native Views)
     *
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineDeliveryView
     */
    getTontineDeliveriesPaginated(
        page: number,
        size: number,
        filters?: any
    ): Observable<any> {
        if (!this.commercialUsername) {
            return of({ content: [], totalElements: 0, totalPages: 0, page, size });
        }
        return from(this.tontineDeliveryRepositoryExtensions.findViewsByCommercialPaginated(
            this.commercialUsername,
            page,
            size,
            filters
        )).pipe(
            catchError(error => {
                console.error('Failed to load paginated tontine deliveries:', error);
                return of({ content: [], totalElements: 0, totalPages: 0, page, size });
            })
        );
    }

    /**
     * Get paginated tontine stocks
     *
     * @param sessionId Session ID
     * @param page Page number
     * @param size Page size
     * @param filters Optional filters
     * @returns Page of TontineStock
     */
    getTontineStocksPaginated(
        sessionId: string,
        page: number,
        size: number,
        filters?: any
    ): Observable<any> {
        if (!this.commercialUsername) {
            return of({ content: [], totalElements: 0, totalPages: 0, page, size });
        }
        return from(this.tontineStockRepositoryExtensions.findAvailableStocksByCommercialPaginated(
            this.commercialUsername,
            sessionId,
            page,
            size,
            filters
        )).pipe(
            catchError(error => {
                console.error('Failed to load paginated tontine stocks:', error);
                return of({ content: [], totalElements: 0, totalPages: 0, page, size });
            })
        );
    }
}
