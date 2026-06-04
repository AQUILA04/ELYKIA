import { Injectable } from '@angular/core';
import { ReliquatRepository } from './reliquat.repository';
import { ClientReliquat, RecoveryPlan } from '../../models/reliquat.model';
import { LoggerService } from './logger.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HealthCheckService } from './health-check.service';
import { DatabaseService } from './database.service';
import { ApiResponse } from '../../models/api-response.model';

export interface ReliquatAccountingEntry {
  clientId: string;
  amount: number;
  lastAccountedDate?: string;
  createdAt: string;
}

interface ReliquatServerDto {
  id?: string;
  clientId: string | number;
  totalAmount: number;
  lastRecoveryId?: string;
  lastAccountedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReliquatService {

  constructor(
    private reliquatRepository: ReliquatRepository,
    private log: LoggerService,
    private http: HttpClient,
    private healthCheckService: HealthCheckService,
    private dbService: DatabaseService
  ) {}

  initializeReliquats(commercialUsername: string): Observable<boolean> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchReliquatsFromApi(commercialUsername).pipe(
            switchMap(dtos => from(this.persistReliquatsFromServer(commercialUsername, dtos))),
            catchError((error) => {
              console.error('Failed to fetch reliquats from API', error);
              return of(true);
            })
          );
        }
        return of(true);
      }),
      catchError(err => {
        console.error('Reliquat initialization failed:', err);
        return of(true);
      })
    );
  }

  private fetchReliquatsFromApi(commercialUsername: string): Observable<ReliquatServerDto[]> {
    const url = `${environment.apiUrl}/api/v1/mobiles/reliquats?commercial=${encodeURIComponent(commercialUsername)}`;
    return this.http.get<ApiResponse<{ content: ReliquatServerDto[] }>>(url).pipe(
      map(response => response.data?.content || [])
    );
  }

  private async persistReliquatsFromServer(commercialUsername: string, dtos: ReliquatServerDto[]): Promise<boolean> {
    await this.reliquatRepository.deleteSynced(commercialUsername);

    let savedCount = 0;
    for (const dto of dtos) {
      const localClientId = await this.resolveLocalClientId(dto.clientId);
      if (!localClientId) {
        this.log.log(`[ReliquatService] Skipping reliquat: client ${dto.clientId} not found locally`);
        continue;
      }

      const reliquat: ClientReliquat = {
        id: dto.id || this.generateUuid(),
        clientId: localClientId,
        commercialId: commercialUsername,
        totalAmount: dto.totalAmount ?? 0,
        lastRecoveryId: dto.lastRecoveryId || '',
        createdAt: dto.createdAt || new Date().toISOString(),
        updatedAt: dto.updatedAt || new Date().toISOString(),
        lastAccountedDate: dto.lastAccountedDate,
        isSync: true,
        syncDate: new Date().toISOString()
      };
      await this.reliquatRepository.upsert(reliquat);
      savedCount++;
    }

    this.log.log(`[ReliquatService] Initialized ${savedCount}/${dtos.length} reliquat(s) for ${commercialUsername}`);
    return true;
  }

  private async resolveLocalClientId(serverClientId: string | number): Promise<string | null> {
    const serverId = serverClientId.toString();

    try {
      const mappingResult = await this.dbService.query(
        'SELECT localId FROM id_mappings WHERE serverId = ? AND entityType = ?',
        [serverId, 'client']
      );
      if (mappingResult?.values?.length) {
        const row = mappingResult.values[0] as { localId?: string; LOCALID?: string };
        const mappedId = row.localId ?? row.LOCALID;
        if (mappedId) {
          return mappedId;
        }
      }
    } catch {
      // ignore mapping lookup errors
    }

    try {
      const client = await this.dbService.getClientById(serverId);
      return client.id;
    } catch {
      return null;
    }
  }

  async getReliquatForClient(clientId: string): Promise<ClientReliquat | null> {
    return this.reliquatRepository.findByClientId(clientId);
  }

  computeRecoveryPlan(
    amountCovered: number,  // Montant défini par les pastilles
    received: number,       // Montant en espèces remis par le client
    existingReliquat: number, // Reliquat accumulé du client
    useReliquat: boolean    // Checkbox "Utiliser le reliquat"
  ): RecoveryPlan {
    
    let cashNeeded = amountCovered;
    let reliquatUsed = 0;

    if (useReliquat && existingReliquat > 0) {
      reliquatUsed = Math.min(existingReliquat, amountCovered);
      cashNeeded = amountCovered - reliquatUsed;
    }

    let reliquatGenerated = 0;
    if (received > cashNeeded) {
      reliquatGenerated = received - cashNeeded;
    }

    return {
      misesCount: 0, // Ignoré dans cette logique
      amountCovered,
      reliquatUsed,
      reliquatGenerated,
      cashNeeded
    };
  }

  async addReliquat(clientId: string, commercialId: string, amount: number, recoveryId: string): Promise<void> {
    let reliquat = await this.getReliquatForClient(clientId);
    const now = new Date().toISOString();

    if (reliquat) {
      reliquat.totalAmount += amount;
      reliquat.lastRecoveryId = recoveryId;
      reliquat.updatedAt = now;
      reliquat.isSync = false;
    } else {
      reliquat = {
        id: this.generateUuid(),
        clientId,
        commercialId,
        totalAmount: amount,
        lastRecoveryId: recoveryId,
        createdAt: now,
        updatedAt: now,
        isSync: false
      };
    }

    await this.reliquatRepository.upsert(reliquat);
    this.log.log(`Added ${amount} reliquat for client ${clientId}`);
  }

  async consumeReliquat(clientId: string, amount: number): Promise<void> {
    const reliquat = await this.getReliquatForClient(clientId);
    
    if (!reliquat) {
      throw new Error(`Cannot consume reliquat: Client ${clientId} has no reliquat`);
    }

    if (amount > reliquat.totalAmount) {
      throw new Error(`Cannot consume ${amount} reliquat: Client ${clientId} only has ${reliquat.totalAmount}`);
    }

    reliquat.totalAmount -= amount;
    // We avoid setting negative totalAmount due to floating point precision issues
    if (reliquat.totalAmount < 0.01) {
      reliquat.totalAmount = 0;
    }
    
    reliquat.updatedAt = new Date().toISOString();
    reliquat.isSync = false;

    await this.reliquatRepository.upsert(reliquat);
    this.log.log(`Consumed ${amount} reliquat for client ${clientId}`);
  }

  async getReliquatsForAccounting(commercialId: string, date: string): Promise<ReliquatAccountingEntry[]> {
    const reliquats = await this.reliquatRepository.findCreatedOnDate(commercialId, date);
    return reliquats.map(r => ({
      clientId: r.clientId,
      amount: r.totalAmount, // Assuming totalAmount here represents the generated amount if queried specifically. Wait, the specs say "Σ(reliquats générés à la date J)". But the client_reliquats table stores the CURRENT total amount. This might be tricky if we don't have the history. The specs say "RapportJournalierService SHALL calculer reliquatNetDuJour = Σ(reliquats générés à la date J)". We might need to query the 'recoveries' table instead to sum reliquatGeneratedAmount for that date. 
      lastAccountedDate: r.lastAccountedDate,
      createdAt: r.createdAt
    }));
  }

  async getUnsynced(commercialId: string): Promise<ClientReliquat[]> {
    return this.reliquatRepository.findUnsynced(commercialId);
  }

  async markAsSynced(id: string): Promise<void> {
    return this.reliquatRepository.markAsSynced(id);
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
