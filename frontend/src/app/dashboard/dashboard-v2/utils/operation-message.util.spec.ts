import { formatOperationMessage } from './operation-message.util';
import { DailyOperationLog } from 'src/app/report/models/daily-operation-log.model';

describe('operation-message.util', () => {
  it('uses backend description when available', () => {
    const log: DailyOperationLog = {
      id: 1,
      timestamp: '2026-06-30T10:00:00',
      commercialUsername: 'ges003',
      type: 'CREDIT_COLLECTION',
      amount: 45000,
      reference: 'Marie Kouassi',
      description: 'Paiement 45 000 F confirmé',
      date: '2026-06-30'
    };

    expect(formatOperationMessage(log)).toBe('Paiement 45 000 F confirmé');
  });

  it('builds a natural language message from operation type and amount', () => {
    const log: DailyOperationLog = {
      id: 2,
      timestamp: '2026-06-30T10:00:00',
      commercialUsername: 'ges003',
      type: 'NEW_CLIENT',
      amount: 0,
      reference: 'Marie Kouassi',
      description: '',
      date: '2026-06-30'
    };

    expect(formatOperationMessage(log)).toContain('ges003');
    expect(formatOperationMessage(log)).toContain('Marie Kouassi');
  });
});
