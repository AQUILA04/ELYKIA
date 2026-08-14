import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { Client } from '../../models/client.model';
import { Recovery } from '../../models/recovery.model';
import { Distribution } from '../../models/distribution.model';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { ClientRepository } from '../repositories/client.repository';
import { ClientRepositoryExtensions, ClientRepositoryFilters } from '../repositories/client.repository.extensions';
import { RecoveryRepository } from '../repositories/recovery.repository';
import { RecoveryRepositoryExtensions, RecoveryRepositoryFilters } from '../repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions, DistributionRepositoryFilters } from '../repositories/distribution.repository.extensions';
import { LocalityRepository } from '../repositories/locality.repository';
import { LocalityRepositoryExtensions, LocalityRepositoryFilters } from '../repositories/locality.repository.extensions';
import { Locality } from '../../models/locality.model';
import {
  TontineMemberRepositoryExtensions,
  TontineMemberRepositoryFilters
} from '../repositories/tontine-member.repository.extensions';
import {
  TontineCollectionRepositoryExtensions,
  TontineCollectionRepositoryFilters
} from '../repositories/tontine-collection.repository.extensions';
import {
  TontineDeliveryRepositoryExtensions,
  TontineDeliveryRepositoryFilters
} from '../repositories/tontine-delivery.repository.extensions';
import {
  TontineStockRepositoryExtensions,
  TontineStockRepositoryFilters
} from '../repositories/tontine-stock.repository.extensions';
import { DatabaseService } from './database.service';
import { Page } from '../repositories/repository.interface';
import { LoggerService } from './logger.service';
import { mapApiCollectionToLocal, mapApiMemberToLocal, shouldSkipPulledCollection } from './tontine-allocation.mapper';

@Injectable({
  providedIn: 'root'
})
export class OnlineListRefreshService {
  constructor(
    private readonly http: HttpClient,
    private readonly connectivityService: ConnectivityService,
    private readonly hybridSyncPreferenceService: HybridSyncPreferenceService,
    private readonly clientRepository: ClientRepository,
    private readonly clientRepositoryExtensions: ClientRepositoryExtensions,
    private readonly recoveryRepository: RecoveryRepository,
    private readonly recoveryRepositoryExtensions: RecoveryRepositoryExtensions,
    private readonly distributionRepositoryExtensions: DistributionRepositoryExtensions,
    private readonly localityRepository: LocalityRepository,
    private readonly localityRepositoryExtensions: LocalityRepositoryExtensions,
    private readonly tontineMemberRepositoryExtensions: TontineMemberRepositoryExtensions,
    private readonly tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions,
    private readonly tontineDeliveryRepositoryExtensions: TontineDeliveryRepositoryExtensions,
    private readonly tontineStockRepositoryExtensions: TontineStockRepositoryExtensions,
    private readonly databaseService: DatabaseService,
    private readonly log: LoggerService
  ) {}

  private async shouldRefreshFromServer(): Promise<boolean> {
    const hybridEnabled = await this.hybridSyncPreferenceService.isHybridSyncEnabled();
    if (!hybridEnabled) {
      return false;
    }
    return this.connectivityService.checkBackendReachable();
  }

  async refreshClientsPage(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: ClientRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const searchParam = filters?.searchQuery ? `&search=${encodeURIComponent(filters.searchQuery)}` : '';
      const url = `${environment.apiUrl}/api/v1/clients/by-commercial/${commercialUsername}?page=${page}&size=${size}&sort=id,desc${searchParam}`;
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ content: Client[]; page: { totalPages: number; number: number; totalElements: number } }>>(url)
      );

      const clients = response.data?.content || [];
      if (clients.length > 0) {
        await this.clientRepository.reconcileIncomingServerClients(clients, commercialUsername);
        await this.clientRepository.saveAll(clients);
      }

      return this.clientRepositoryExtensions.findViewsByCommercialPaginated(commercialUsername, page, size, filters);
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] clients page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshRecoveriesPage(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: RecoveryRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const url = `${environment.apiUrl}/api/v1/mobiles/credit-timelines/${commercialUsername}`;
      const response = await firstValueFrom(this.http.get<ApiResponse<Recovery[]>>(url));
      const recoveries = response.data || [];

      await this.recoveryRepository.deleteSynced(commercialUsername);
      const enrichedRecoveries = recoveries.map((recovery) => ({
        ...recovery,
        id: recovery.reference || recovery.id,
        commercialId: recovery.commercialId || commercialUsername,
        isSync: true,
        isLocal: false,
        syncDate: new Date().toISOString()
      }));
      if (enrichedRecoveries.length > 0) {
        await this.recoveryRepository.saveAll(enrichedRecoveries);
      }

      return this.recoveryRepositoryExtensions.findViewsByCommercialPaginated(commercialUsername, page, size, filters);
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] recoveries page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshDistributionsPage(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: DistributionRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const searchParam = filters?.searchQuery ? `&search=${encodeURIComponent(filters.searchQuery)}` : '';
      const url = `${environment.apiUrl}/api/v1/credits/by-commercial/${commercialUsername}?page=${page}&size=${size}&sort=id,desc${searchParam}`;
      const response = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      const distributions: Distribution[] = response.data?.content || [];

      if (distributions.length > 0) {
        await this.databaseService.saveDistributionsAndItems(distributions);
      }

      return this.distributionRepositoryExtensions.findViewsByCommercialPaginated(commercialUsername, page, size, filters);
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] distributions page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshLocalitiesPage(
    page: number,
    size: number,
    filters?: LocalityRepositoryFilters
  ): Promise<Page<Locality> | null> {
    if (!await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const url = `${environment.apiUrl}/api/v1/localities?page=${page}&size=${size}&sort=name,asc`;
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{
          content: Locality[];
          totalElements: number;
          totalPages: number;
          number: number;
        }>>(url)
      );

      const serverPage = response.data;
      const localities = (serverPage?.content || []).map((locality) => ({
        ...locality,
        id: String(locality.id),
        isSync: true,
        isLocal: false,
        syncDate: new Date().toISOString()
      }));

      if (localities.length > 0) {
        await this.localityRepository.saveAll(localities);
      }

      return this.localityRepositoryExtensions.findAllPaginated(page, size, filters);
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] localities page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshTontineMembersPage(
    sessionId: string,
    commercialUsername: string,
    page: number,
    size: number,
    filters?: TontineMemberRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!sessionId || !commercialUsername || !await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const searchParam = filters?.searchQuery ? `&search=${encodeURIComponent(filters.searchQuery)}` : '';
      const statusParam = filters?.deliveryStatus
        ? `&deliveryStatus=${encodeURIComponent(filters.deliveryStatus)}`
        : '';
      const url =
        `${environment.apiUrl}/api/v1/tontines/members?page=${page}&size=${size}` +
        `&commercial=${encodeURIComponent(commercialUsername)}${searchParam}${statusParam}`;

      const response = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      const pageData = response.data;
      const members = pageData?.content || [];
      const unsyncedTotals = await this.databaseService.getUnsyncedCollectionsTotals();
      const unsyncedMap = new Map<string, number>();
      unsyncedTotals.forEach((t) => unsyncedMap.set(String(t.tontineMemberId), t.total));

      const mappedMembers = members.map((m: any) => {
        const memberIdStr = String(m.id);
        const localUnsynced = unsyncedMap.get(memberIdStr) || 0;
        return mapApiMemberToLocal(m, sessionId, commercialUsername, localUnsynced);
      });

      const deliveries: any[] = [];
      members.forEach((m: any) => {
        if (!m.delivery) {
          return;
        }
        deliveries.push({
          id: String(m.delivery.id),
          tontineMemberId: String(m.id),
          commercialUsername,
          requestDate: m.delivery.requestDate,
          deliveryDate: m.delivery.deliveryDate,
          totalAmount: m.delivery.totalAmount,
          status: m.delivery.status,
          isLocal: false,
          isSync: true,
          items: (m.delivery.items || []).map((i: any) => {
            const articleId = i.articleId || i.articles?.id || i.article?.id;
            return {
              id: String(i.id),
              tontineDeliveryId: String(m.delivery.id),
              articleId: articleId != null ? String(articleId) : null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice
            };
          })
        });
      });

      if (mappedMembers.length > 0) {
        await this.databaseService.saveTontineMembers(mappedMembers);
      }
      if (deliveries.length > 0) {
        await this.databaseService.saveTontineDeliveries(deliveries);
      }

      return this.tontineMemberRepositoryExtensions.findBySessionAndCommercialPaginated(
        sessionId,
        commercialUsername,
        page,
        size,
        filters
      );
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] tontine members page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshTontineCollectionsPage(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: TontineCollectionRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!commercialUsername || !await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const url = `${environment.apiUrl}/api/v1/tontines/collections?page=${page}&size=${size}`;
      const response = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      const pageData = response.data;
      const collections = pageData?.content || [];

      const unsyncedIds = new Set(await this.databaseService.getUnsyncedLocalCollectionIds());
      const mappedCollections = collections
        .filter((c: any) => !shouldSkipPulledCollection(c, unsyncedIds))
        .map((c: any) => mapApiCollectionToLocal(c, commercialUsername))
        .filter((c: any) => !!c.tontineMemberId && c.tontineMemberId !== 'undefined');

      if (mappedCollections.length > 0) {
        await this.databaseService.saveTontineCollections(mappedCollections);
      }

      return this.tontineCollectionRepositoryExtensions.findViewsByCommercialPaginated(
        commercialUsername,
        page,
        size,
        filters
      );
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] tontine collections page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshTontineDeliveriesPage(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: TontineDeliveryRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!commercialUsername || !await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const searchParam = filters?.searchQuery ? `&search=${encodeURIComponent(filters.searchQuery)}` : '';
      const url =
        `${environment.apiUrl}/api/v1/tontines/deliveries/list?page=${page}&size=${size}` +
        `&commercial=${encodeURIComponent(commercialUsername)}${searchParam}`;

      const response = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      const pageData = response.data;
      const deliveries = pageData?.content || [];

      const mappedDeliveries = deliveries.map((d: any) => ({
        id: String(d.id),
        reference: d.reference ?? null,
        tontineMemberId: String(d.tontineMemberId || d.tontineMember?.id || d.memberId),
        commercialUsername: d.commercialUsername || d.commercial || commercialUsername,
        requestDate: d.requestDate,
        deliveryDate: d.deliveryDate,
        totalAmount: d.totalAmount,
        status: d.status,
        isLocal: false,
        isSync: true,
        items: (d.items || []).map((i: any) => {
          const articleId = i.articleId || i.articles?.id || i.article?.id;
          return {
            id: String(i.id),
            tontineDeliveryId: String(d.id),
            articleId: articleId != null ? String(articleId) : null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice
          };
        })
      })).filter((d: any) => !!d.tontineMemberId && d.tontineMemberId !== 'undefined');

      if (mappedDeliveries.length > 0) {
        await this.databaseService.saveTontineDeliveries(mappedDeliveries);
      }

      return this.tontineDeliveryRepositoryExtensions.findViewsByCommercialPaginated(
        commercialUsername,
        page,
        size,
        filters
      );
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] tontine deliveries page ${page} failed: ${String(error)}`);
      return null;
    }
  }

  async refreshTontineStocksPage(
    sessionId: string,
    commercialUsername: string,
    page: number,
    size: number,
    filters?: TontineStockRepositoryFilters
  ): Promise<Page<any> | null> {
    if (!sessionId || !commercialUsername || !await this.shouldRefreshFromServer()) {
      return null;
    }

    try {
      const url =
        `${environment.apiUrl}/api/v1/tontines/stock?page=${page}&size=${size}` +
        `&commercial=${encodeURIComponent(commercialUsername)}`;
      const response = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      const pageData = response.data;
      const stocks = Array.isArray(pageData?.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);

      const mappedStocks = stocks.map((s: any) => ({
        id: s.id?.toString() || String(s.id),
        commercial: s.commercial || commercialUsername,
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

      if (mappedStocks.length > 0) {
        await this.databaseService.saveTontineStocks(mappedStocks);
      }

      return this.tontineStockRepositoryExtensions.findAvailableStocksByCommercialPaginated(
        commercialUsername,
        sessionId,
        page,
        size,
        filters
      );
    } catch (error) {
      void this.log.log(`[OnlineListRefresh] tontine stocks page ${page} failed: ${String(error)}`);
      return null;
    }
  }
}
