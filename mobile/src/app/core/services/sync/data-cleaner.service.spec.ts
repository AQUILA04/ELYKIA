import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DataCleanerService } from './data-cleaner.service';
import { DatabaseService } from '../database.service';
import { CleanupResult } from '../../models/tontine-sync.models';

describe('DataCleanerService', () => {
    let service: DataCleanerService;
    let databaseServiceSpy: MockedObject<DatabaseService>;

    beforeEach(() => {
        // Créer un spy pour DatabaseService
        const dbSpy = {
            getTontineSession: vi.fn().mockName("DatabaseService.getTontineSession"),
            execute: vi.fn().mockName("DatabaseService.execute"),
            query: vi.fn().mockName("DatabaseService.query")
        };

        TestBed.configureTestingModule({
            providers: [
                DataCleanerService,
                { provide: DatabaseService, useValue: dbSpy }
            ]
        });

        service = TestBed.inject(DataCleanerService);
        databaseServiceSpy = TestBed.inject(DatabaseService) as MockedObject<DatabaseService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('countUnsyncedTontineData', () => {
        it('sums unsynced members, collections and deliveries', async () => {
            databaseServiceSpy.query.mockReturnValueOnce(Promise.resolve({ values: [{ count: 2 }] })).mockReturnValueOnce(Promise.resolve({ values: [{ count: 3 }] })).mockReturnValueOnce(Promise.resolve({ values: [{ count: 1 }] }));

            await expect(service.countUnsyncedTontineData('com1')).resolves.toEqual(6);
        });

        it('returns 0 for empty commercial username', async () => {
            await expect(service.countUnsyncedTontineData('')).resolves.toEqual(0);
            expect(databaseServiceSpy.query).not.toHaveBeenCalled();
        });
    });

    describe('cleanTontineData', () => {
        it('should clean all tontine data and return cleanup result', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            const sessionId = 'session-123';

            databaseServiceSpy.getTontineSession.mockReturnValue(Promise.resolve({ id: sessionId }));
            databaseServiceSpy.query.mockReturnValueOnce(Promise.resolve({ values: [{ count: 5 }] })).mockReturnValueOnce(// members count
            Promise.resolve({ values: [{ count: 10 }] })).mockReturnValueOnce(// collections count
            Promise.resolve({ values: [{ count: 3 }] }) // stocks count
            );
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            const result: CleanupResult = await service.cleanTontineData(commercialUsername);

            // Assert
            expect(result.success).toBe(true);
            expect(result.membersDeleted).toBe(5);
            expect(result.collectionsDeleted).toBe(10);
            expect(result.stocksDeleted).toBe(3);
            expect(databaseServiceSpy.getTontineSession).toHaveBeenCalled();
        });

        it('should throw error when commercialUsername is empty', async () => {
            // Act & Assert
            await expect(service.cleanTontineData('')).rejects.toThrowError('commercialUsername est requis pour le nettoyage des données');
        });

        it('should throw error when no tontine session found', async () => {
            // Arrange
            databaseServiceSpy.getTontineSession.mockReturnValue(Promise.resolve(null));

            // Act & Assert
            await expect(service.cleanTontineData('testuser')).rejects.toThrowError('Aucune session tontine trouvée pour le nettoyage');
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            databaseServiceSpy.getTontineSession.mockReturnValue(Promise.reject(new Error('Database connection failed')));

            // Act & Assert
            await expect(service.cleanTontineData(commercialUsername)).rejects.toThrowError(/Échec du nettoyage des données tontine/);
        });
    });

    describe('cleanMembers', () => {
        it('should delete members for given session and commercial', async () => {
            // Arrange
            const sessionId = 'session-123';
            const commercialUsername = 'testuser';
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            await service.cleanMembers(sessionId, commercialUsername);

            // Assert
            expect(databaseServiceSpy.execute).toHaveBeenCalledTimes(4); // amount history, delivery items, deliveries, members
        });

        it('should throw error when sessionId is empty', async () => {
            // Act & Assert
            await expect(service.cleanMembers('', 'testuser')).rejects.toThrowError('sessionId est requis pour le nettoyage des membres');
        });

        it('should throw error when commercialUsername is empty', async () => {
            // Act & Assert
            await expect(service.cleanMembers('session-123', '')).rejects.toThrowError('commercialUsername est requis pour le nettoyage des membres');
        });

        it('should handle database errors during member cleanup', async () => {
            // Arrange
            databaseServiceSpy.execute.mockReturnValue(Promise.reject(new Error('Delete failed')));

            // Act & Assert
            await expect(service.cleanMembers('session-123', 'testuser')).rejects.toThrowError(/Échec du nettoyage des membres/);
        });
    });

    describe('cleanCollections', () => {
        it('should delete collections for given commercial', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            await service.cleanCollections(commercialUsername);

            // Assert
            expect(databaseServiceSpy.execute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM tontine_collections'), [commercialUsername]);
        });

        it('should throw error when commercialUsername is empty', async () => {
            // Act & Assert
            await expect(service.cleanCollections('')).rejects.toThrowError('commercialUsername est requis pour le nettoyage des collections');
        });

        it('should handle database errors during collection cleanup', async () => {
            // Arrange
            databaseServiceSpy.execute.mockReturnValue(Promise.reject(new Error('Delete failed')));

            // Act & Assert
            await expect(service.cleanCollections('testuser')).rejects.toThrowError(/Échec du nettoyage des collections/);
        });
    });

    describe('cleanStocks', () => {
        it('should delete stocks for given commercial', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            await service.cleanStocks(commercialUsername);

            // Assert
            expect(databaseServiceSpy.execute).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM tontine_stocks'), [commercialUsername]);
        });

        it('should throw error when commercialUsername is empty', async () => {
            // Act & Assert
            await expect(service.cleanStocks('')).rejects.toThrowError('commercialUsername est requis pour le nettoyage des stocks');
        });

        it('should handle database errors during stock cleanup', async () => {
            // Arrange
            databaseServiceSpy.execute.mockReturnValue(Promise.reject(new Error('Delete failed')));

            // Act & Assert
            await expect(service.cleanStocks('testuser')).rejects.toThrowError(/Échec du nettoyage des stocks/);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero items to delete', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            const sessionId = 'session-123';

            databaseServiceSpy.getTontineSession.mockReturnValue(Promise.resolve({ id: sessionId }));
            databaseServiceSpy.query.mockReturnValueOnce(Promise.resolve({ values: [{ count: 0 }] })).mockReturnValueOnce(// members count
            Promise.resolve({ values: [{ count: 0 }] })).mockReturnValueOnce(// collections count
            Promise.resolve({ values: [{ count: 0 }] }) // stocks count
            );
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            const result: CleanupResult = await service.cleanTontineData(commercialUsername);

            // Assert
            expect(result.success).toBe(true);
            expect(result.membersDeleted).toBe(0);
            expect(result.collectionsDeleted).toBe(0);
            expect(result.stocksDeleted).toBe(0);
        });

        it('should handle whitespace-only commercialUsername', async () => {
            // Act & Assert
            await expect(service.cleanTontineData('   ')).rejects.toThrowError('commercialUsername est requis pour le nettoyage des données');
        });

        it('should handle null query results gracefully', async () => {
            // Arrange
            const commercialUsername = 'testuser';
            const sessionId = 'session-123';

            databaseServiceSpy.getTontineSession.mockReturnValue(Promise.resolve({ id: sessionId }));
            databaseServiceSpy.query.mockReturnValueOnce(Promise.resolve({ values: null })).mockReturnValueOnce(// null values
            Promise.resolve({ values: [] })).mockReturnValueOnce(// empty values
            Promise.resolve(null) // null result
            );
            databaseServiceSpy.execute.mockReturnValue(Promise.resolve());

            // Act
            const result: CleanupResult = await service.cleanTontineData(commercialUsername);

            // Assert
            expect(result.success).toBe(true);
            expect(result.membersDeleted).toBe(0);
            expect(result.collectionsDeleted).toBe(0);
            expect(result.stocksDeleted).toBe(0);
        });
    });
});
