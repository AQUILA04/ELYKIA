import { TestBed } from '@angular/core/testing';
import { SyncLoggerService, SyncLogLevel, SyncOperationStatus } from './sync-logger.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';

describe('SyncLoggerService', () => {
  let service: SyncLoggerService;
  let mockDbService: jasmine.SpyObj<DatabaseService>;
  let mockLogService: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    // Create mock services
    mockDbService = jasmine.createSpyObj('DatabaseService', ['execute', 'query']);
    mockLogService = jasmine.createSpyObj('LoggerService', ['log', 'error']);

    TestBed.configureTestingModule({
      providers: [
        SyncLoggerService,
        { provide: DatabaseService, useValue: mockDbService },
        { provide: LoggerService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(SyncLoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('logOperation', () => {
    it('should log an operation with all fields', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logOperation({
        sessionId: 'session-123',
        commercialUsername: 'user1',
        operationType: 'members',
        status: SyncOperationStatus.SUCCESS,
        level: SyncLogLevel.INFO,
        message: 'Members synced successfully',
        duration: 1500,
        itemsProcessed: 257
      });

      expect(logId).toBeTruthy();
      expect(mockDbService.execute).toHaveBeenCalled();
      expect(mockLogService.log).toHaveBeenCalled();
    });

    it('should handle context as JSON string', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const context = { page: 1, totalPages: 3 };
      await service.logOperation({
        sessionId: 'session-123',
        commercialUsername: 'user1',
        operationType: 'members',
        status: SyncOperationStatus.IN_PROGRESS,
        level: SyncLogLevel.INFO,
        message: 'Processing page 1',
        context: JSON.stringify(context)
      });

      expect(mockDbService.execute).toHaveBeenCalled();
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[7]).toContain('page');
    });

    it('should handle errors gracefully', async () => {
      mockDbService.execute.and.returnValue(Promise.reject(new Error('DB error')));

      await expectAsync(
        service.logOperation({
          sessionId: 'session-123',
          commercialUsername: 'user1',
          operationType: 'members',
          status: SyncOperationStatus.FAILED,
          level: SyncLogLevel.ERROR,
          message: 'Operation failed'
        })
      ).toBeRejected();

      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('logOperationStart', () => {
    it('should log operation start with INFO level', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logOperationStart(
        'session-123',
        'user1',
        'members',
        'Starting members sync'
      );

      expect(logId).toBeTruthy();
      expect(mockDbService.execute).toHaveBeenCalled();
      
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[4]).toBe(SyncOperationStatus.STARTED);
      expect(params[5]).toBe(SyncLogLevel.INFO);
    });

    it('should include context if provided', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const context = { batchSize: 100 };
      await service.logOperationStart(
        'session-123',
        'user1',
        'members',
        'Starting members sync',
        context
      );

      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[7]).toContain('batchSize');
    });
  });

  describe('logOperationSuccess', () => {
    it('should log operation success with metrics', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logOperationSuccess(
        'session-123',
        'user1',
        'members',
        'Members synced successfully',
        2500,
        257
      );

      expect(logId).toBeTruthy();
      
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[4]).toBe(SyncOperationStatus.SUCCESS);
      expect(params[5]).toBe(SyncLogLevel.INFO);
      expect(params[9]).toBe(2500); // duration
      expect(params[10]).toBe(257); // itemsProcessed
    });
  });

  describe('logOperationFailure', () => {
    it('should log operation failure with error message', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logOperationFailure(
        'session-123',
        'user1',
        'members',
        'Members sync failed',
        'Network timeout',
        1000
      );

      expect(logId).toBeTruthy();
      
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[4]).toBe(SyncOperationStatus.FAILED);
      expect(params[5]).toBe(SyncLogLevel.ERROR);
      expect(params[11]).toBe('Network timeout'); // errorMessage
    });
  });

  describe('logWarning', () => {
    it('should log warning with WARNING level', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logWarning(
        'session-123',
        'user1',
        'members',
        'Slow network detected'
      );

      expect(logId).toBeTruthy();
      
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[5]).toBe(SyncLogLevel.WARNING);
    });
  });

  describe('queryLogs', () => {
    it('should query logs without filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          sessionId: 'session-123',
          commercialUsername: 'user1',
          operationType: 'members',
          status: SyncOperationStatus.SUCCESS,
          level: SyncLogLevel.INFO,
          message: 'Test log',
          context: null,
          timestamp: new Date().toISOString(),
          duration: 1000,
          itemsProcessed: 100,
          errorMessage: null
        }
      ];

      mockDbService.query.and.returnValue(Promise.resolve({ values: mockLogs }));

      const logs = await service.queryLogs();

      expect(logs.length).toBe(1);
      expect(logs[0].id).toBe('log-1');
      expect(logs[0].sessionId).toBe('session-123');
    });

    it('should filter logs by sessionId', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      await service.queryLogs({ sessionId: 'session-123' });

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const sql = callArgs[0];
      const params = callArgs[1];
      
      expect(sql).toContain('sessionId = ?');
      expect(params).toContain('session-123');
    });

    it('should filter logs by date range', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.queryLogs({ startDate, endDate });

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const sql = callArgs[0];
      
      expect(sql).toContain('timestamp >= ?');
      expect(sql).toContain('timestamp <= ?');
    });

    it('should apply limit to results', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      await service.queryLogs({ limit: 50 });

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const sql = callArgs[0];
      const params = callArgs[1];
      
      expect(sql).toContain('LIMIT ?');
      expect(params).toContain(50);
    });

    it('should handle query errors gracefully', async () => {
      mockDbService.query.and.returnValue(Promise.reject(new Error('Query error')));

      const logs = await service.queryLogs();

      expect(logs).toEqual([]);
      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('getSessionLogs', () => {
    it('should retrieve logs for a specific session', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      await service.getSessionLogs('session-123');

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const params = callArgs[1];
      
      expect(params).toContain('session-123');
    });
  });

  describe('getRecentLogs', () => {
    it('should retrieve logs from last 24 hours', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      await service.getRecentLogs(100);

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const sql = callArgs[0];
      
      expect(sql).toContain('timestamp >= ?');
      expect(sql).toContain('LIMIT ?');
    });
  });

  describe('getErrorLogs', () => {
    it('should retrieve only error logs', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: [] }));

      await service.getErrorLogs(50);

      const callArgs = mockDbService.query.calls.mostRecent().args;
      const params = callArgs[1];
      
      expect(params).toContain(SyncLogLevel.ERROR);
    });
  });

  describe('getLogCount', () => {
    it('should return total log count', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ 
        values: [{ count: 150 }] 
      }));

      const count = await service.getLogCount();

      expect(count).toBe(150);
    });

    it('should return 0 on error', async () => {
      mockDbService.query.and.returnValue(Promise.reject(new Error('Query error')));

      const count = await service.getLogCount();

      expect(count).toBe(0);
    });
  });

  describe('rotateLogsIfNeeded', () => {
    it('should not rotate if under limit', async () => {
      spyOn(service, 'getLogCount').and.returnValue(Promise.resolve(500));

      await service.rotateLogsIfNeeded();

      expect(mockDbService.execute).not.toHaveBeenCalled();
    });

    it('should delete old logs when over limit', async () => {
      spyOn(service, 'getLogCount')
        .and.returnValues(Promise.resolve(1500), Promise.resolve(900));
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      await service.rotateLogsIfNeeded();

      expect(mockDbService.execute).toHaveBeenCalled();
      expect(mockLogService.log).toHaveBeenCalled();
    });

    it('should preserve error logs during rotation', async () => {
      spyOn(service, 'getLogCount')
        .and.returnValues(Promise.resolve(1500), Promise.resolve(900));
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      await service.rotateLogsIfNeeded();

      const callArgs = mockDbService.execute.calls.first().args;
      const params = callArgs[1];
      
      expect(params).toContain(SyncLogLevel.ERROR);
    });
  });

  describe('deleteSessionLogs', () => {
    it('should delete all logs for a session', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      await service.deleteSessionLogs('session-123');

      expect(mockDbService.execute).toHaveBeenCalled();
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const sql = callArgs[0];
      const params = callArgs[1];
      
      expect(sql).toContain('DELETE FROM sync_operation_logs');
      expect(sql).toContain('sessionId = ?');
      expect(params).toContain('session-123');
    });
  });

  describe('clearAllLogs', () => {
    it('should delete all logs', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      await service.clearAllLogs();

      expect(mockDbService.execute).toHaveBeenCalled();
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const sql = callArgs[0];
      
      expect(sql).toBe('DELETE FROM sync_operation_logs');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query results', async () => {
      mockDbService.query.and.returnValue(Promise.resolve({ values: null }));

      const logs = await service.queryLogs();

      expect(logs).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const logId = await service.logOperation({
        sessionId: 'session-123',
        commercialUsername: 'user1',
        operationType: 'members',
        status: SyncOperationStatus.SUCCESS,
        level: SyncLogLevel.INFO,
        message: 'Test'
        // No duration, itemsProcessed, context, errorMessage
      });

      expect(logId).toBeTruthy();
      
      const callArgs = mockDbService.execute.calls.mostRecent().args;
      const params = callArgs[1];
      expect(params[7]).toBeNull(); // context
      expect(params[9]).toBeNull(); // duration
      expect(params[10]).toBeNull(); // itemsProcessed
      expect(params[11]).toBeNull(); // errorMessage
    });

    it('should handle very long messages', async () => {
      mockDbService.execute.and.returnValue(Promise.resolve({}));

      const longMessage = 'A'.repeat(1000);
      const logId = await service.logOperation({
        sessionId: 'session-123',
        commercialUsername: 'user1',
        operationType: 'members',
        status: SyncOperationStatus.SUCCESS,
        level: SyncLogLevel.INFO,
        message: longMessage
      });

      expect(logId).toBeTruthy();
    });
  });
});
