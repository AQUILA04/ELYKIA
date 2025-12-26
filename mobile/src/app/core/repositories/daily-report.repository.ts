import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { DatabaseService } from '../services/database.service';

// DailyReport interface might not be exported or defined in a model file.
// I will use 'any' for now or define a local interface if needed, matching DatabaseService usage.
// DatabaseService uses 'any' in saveDailyReport(reportData: any, ...).
// But there is a table 'daily_reports'.
// Let's assume there is no specific model class imported in DatabaseService for it, it uses 'any'.

@Injectable({
    providedIn: 'root'
})
export class DailyReportRepository extends BaseRepository<any, string> {
    protected tableName = 'daily_reports';

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAll(entities: any[]): Promise<void> {
        if (!this.databaseService['db']) {
            throw new Error('Database not initialized.');
        }

        for (const report of entities) {
            // We assume 'report' has the structure of the table or is the 'reportData' + 'commercialId'?
            // If I want to be compatible with standard Repository<T>, T should be the DailyReport entity.
            // DatabaseService.saveDailyReport logic:
            // id = `${commercialId}-${today}`
            // checks existence, then update or insert.

            // If the caller passes a fully formed DailyReport object (id, date, commercialId, etc.), I can just save it.
            // If the caller passes 'reportData', I need to know how to construct it.
            // I will assume the caller will now be responsible for creating the DailyReport object 
            // (possibly using a factory or service) and passing it here.
            // OR I can keep the logic if I can infer it.
            // Let's assume T is the table row.

            const id = report.id;
            const existingReport = await this.databaseService.query(`SELECT id FROM daily_reports WHERE id = ?`, [id]);

            // Params mapping
            // If report is the full entity:
            const params = [
                report.totalDistributions,
                report.totalDistributionAmount,
                report.totalRecoveries,
                report.totalRecoveryAmount,
                report.newClients,
                report.clientsInitialTotalBalance,
                report.reportData, // This seems to be a JSON string or object? DBService stringifies it: JSON.stringify(reportData)
                report.isPrinted ? 1 : 0,
                report.createdAt || new Date().toISOString()
            ];

            if (existingReport.values && existingReport.values.length > 0) {
                const sql = `UPDATE daily_reports SET
                        totalDistributions = ?,
                        totalDistributionAmount = ?,
                        totalRecoveries = ?,
                        totalRecoveryAmount = ?,
                        newClients = ?,
                        clientsInitialTotalBalance = ?,
                        reportData = ?,
                        isPrinted = ?,
                        createdAt = ?
                       WHERE id = ?`;
                await this.databaseService['db']!.run(sql, [...params, id]);
            } else {
                const sql = `INSERT INTO daily_reports (
                        id, date, commercialId, totalDistributions, totalDistributionAmount,
                        totalRecoveries, totalRecoveryAmount, newClients, clientsInitialTotalBalance,
                        reportData, isPrinted, createdAt
                       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                await this.databaseService['db']!.run(sql, [id, report.date, report.commercialId, ...params]);
            }
        }
    }
}
