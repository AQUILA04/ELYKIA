import { applyDetectedReference } from './payment-proof-capture';

describe('applyDetectedReference', () => {
  it('fills empty field', () => {
    expect(applyDetectedReference('', null, 'TXN-1')).toEqual({
      value: 'TXN-1',
      autoFilled: 'TXN-1',
    });
  });

  it('replaces previous auto-filled value', () => {
    expect(applyDetectedReference('TXN-1', 'TXN-1', 'TXN-2')).toEqual({
      value: 'TXN-2',
      autoFilled: 'TXN-2',
    });
  });

  it('preserves manual edit', () => {
    expect(applyDetectedReference('MANUAL', 'TXN-1', 'TXN-2')).toEqual({
      value: 'MANUAL',
      autoFilled: 'TXN-1',
    });
  });
});
