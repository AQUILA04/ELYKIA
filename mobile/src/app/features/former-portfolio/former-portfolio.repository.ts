import { Injectable } from '@angular/core';
import { DatabaseService } from '../../core/services/database.service';
import {
  FormerAgencySaleRow,
  FormerCreditRow,
  FormerCreditTimelineRow,
  FormerPortfolioSyncPayload,
  FormerTontineCollectionRow,
  FormerTontineMemberRow
} from './former-portfolio.models';

@Injectable({ providedIn: 'root' })
export class FormerPortfolioRepository {
  constructor(private readonly database: DatabaseService) {}

  async replace(commercial: string, payload: FormerPortfolioSyncPayload): Promise<void> {
    const tables = [
      'former_tontine_member',
      'former_tontine_collection',
      'former_credit',
      'former_credit_timeline',
      'former_agency_sale'
    ];
    for (const table of tables) {
      await this.database.execute(`DELETE FROM ${table} WHERE commercialUsername = ?`, [commercial]);
    }
    for (const member of payload.tontineMembers ?? []) {
      const ownTotal = member.ownTotal ?? member.ownCollectionsTotal ?? 0;
      await this.database.execute(
        `INSERT INTO former_tontine_member
          (id, memberId, sessionYear, clientCode, firstname, lastname, phone, quarter, ownTotal, commercialUsername)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${commercial}:m:${member.memberId}`,
          member.memberId,
          member.sessionYear,
          member.clientCode,
          member.firstname,
          member.lastname,
          member.phone,
          member.quarter,
          ownTotal,
          commercial
        ]
      );
    }
    for (const line of payload.tontineCollections ?? []) {
      await this.database.execute(
        `INSERT INTO former_tontine_collection
          (id, memberId, amount, collectionDate, reference, commercialUsername)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`${commercial}:tc:${line.id}`, line.memberId, line.amount, line.collectionDate, line.reference, commercial]
      );
    }
    for (const credit of payload.credits ?? []) {
      await this.database.execute(
        `INSERT INTO former_credit
          (id, creditId, reference, clientCode, firstname, lastname, phone, quarter, handoverDate,
           totalAmountAtHandover, totalRemainingAtHandover, ownRecoveriesTotal, commercialUsername)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${commercial}:c:${credit.creditId}`,
          credit.creditId,
          credit.reference,
          credit.clientCode,
          credit.firstname,
          credit.lastname,
          credit.phone,
          credit.quarter,
          credit.handoverDate,
          credit.totalAmountAtHandover,
          credit.totalRemainingAtHandover,
          credit.ownRecoveriesTotal,
          commercial
        ]
      );
    }
    for (const line of payload.creditTimelines ?? []) {
      await this.database.execute(
        `INSERT INTO former_credit_timeline
          (id, creditId, amount, operationDate, reference, commercialUsername)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`${commercial}:ct:${line.id}`, line.creditId, line.amount, line.operationDate, line.reference, commercial]
      );
    }
    for (const sale of payload.agencySales ?? []) {
      await this.database.execute(
        `INSERT INTO former_agency_sale
          (id, creditId, clientId, reference, clientCode, firstname, lastname, phone, quarter, saleDate, totalAmount, commercialUsername)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${commercial}:a:${sale.creditId}`,
          sale.creditId,
          sale.clientId,
          sale.reference,
          sale.clientCode,
          sale.firstname,
          sale.lastname,
          sale.phone,
          sale.quarter,
          sale.saleDate,
          sale.totalAmount,
          commercial
        ]
      );
    }
  }

  async listMembers(commercial: string): Promise<FormerTontineMemberRow[]> {
    const result = await this.database.query(
      `SELECT memberId, sessionYear, clientCode, firstname, lastname, phone, quarter, ownTotal
       FROM former_tontine_member WHERE commercialUsername = ? ORDER BY lastname, firstname`,
      [commercial]
    );
    return (result?.values ?? []) as FormerTontineMemberRow[];
  }

  async collectionsOf(commercial: string, memberId: number): Promise<FormerTontineCollectionRow[]> {
    const result = await this.database.query(
      `SELECT memberId, id, amount, collectionDate, reference
       FROM former_tontine_collection WHERE commercialUsername = ? AND memberId = ?
       ORDER BY collectionDate DESC`,
      [commercial, memberId]
    );
    return (result?.values ?? []) as FormerTontineCollectionRow[];
  }

  async listCredits(commercial: string): Promise<FormerCreditRow[]> {
    const result = await this.database.query(
      `SELECT creditId, reference, clientCode, firstname, lastname, phone, quarter, handoverDate,
              totalAmountAtHandover, totalRemainingAtHandover, ownRecoveriesTotal
       FROM former_credit WHERE commercialUsername = ? ORDER BY handoverDate DESC`,
      [commercial]
    );
    return (result?.values ?? []) as FormerCreditRow[];
  }

  async timelinesOf(commercial: string, creditId: number): Promise<FormerCreditTimelineRow[]> {
    const result = await this.database.query(
      `SELECT creditId, id, amount, operationDate, reference
       FROM former_credit_timeline WHERE commercialUsername = ? AND creditId = ?
       ORDER BY operationDate DESC`,
      [commercial, creditId]
    );
    return (result?.values ?? []) as FormerCreditTimelineRow[];
  }

  async listAgencySales(commercial: string): Promise<FormerAgencySaleRow[]> {
    const result = await this.database.query(
      `SELECT creditId, clientId, reference, clientCode, firstname, lastname, phone, quarter, saleDate, totalAmount
       FROM former_agency_sale WHERE commercialUsername = ? ORDER BY saleDate DESC`,
      [commercial]
    );
    return (result?.values ?? []) as FormerAgencySaleRow[];
  }
}
